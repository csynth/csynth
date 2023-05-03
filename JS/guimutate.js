/*
 * Code to hanel GUI interaction s controlling user input to mutation
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";
/** for encapsulation verification */
var W, NODO, inputs, currentObjects, genedefs, dustbinvp, mainvp, trygetele, throwe,  isSteeringInteraction, xxxgenes,
serious, settarget, clone, reserveSlots, showObjectHealth, extraDispobj;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ hover mutate options
var hoverMutateMode = false;

var healthMutateSettings = {
    boostRate: 2, decayRate: 0.5, initialHealth: 100, currentvpForce: 5000, maxHealth: 150, touchHealth: false
};

function setHealthMode(v) {
    if (v === undefined) trygetele("healthMutate", "checked");
    healthMutateSettings.touchHealth = v;
    // TODO use color on dispobj
    //for (var i=0; i<vp health.length; i++)  {
    //    vp health[i].style.display = v ? "block" : "none";
    //}
}

var healthTarget = NODO;
/** make object target for centre slot
 * called when mouse has been see hovering over this slot */
function hoverMutate(vn) {
    if (!hoverMutateMode) return;
    throwe("hoverMutate code waiting fix !!!!!!!");
    if (vn === NODO) return;
    // no hover with animate for now ... not correct logic?
    // hovering/steering control may be independent of anim mode
    // However, this allows for hover experiments for 'normal' mutation
    // and for specific steered 'hover-like' control for exhibition
    if (inputs.doAnim && !isSteeringInteraction()) {
        healthTarget = NODO;
        return;
    }
////!!!    var vp = view ports[vn];
    if (vn >= 1 && xxxgenes(vn)) {
        //<<< what vp?
        serious("what vp in hoverMutate?");
        //???vp.dispobj.selected = true;
        //console.log("hoverMutate selected =>" + vp.dispobj.selected);
        var genes = xxxgenes(vn);
        if (healthTarget !== vn) {
            healthTarget = vn;
            // never do direct settarget when in anim mode, steer instead
            // unless we are in the projection mode
            if (!inputs.doAnim ) settarget(clone(genes));
        }
    }
    //forcerefresh = true;
}

/** modify and display health */
function healthMutateStep() {
    //<< xxxgenes(mainvp) === currentObject and is probably not candidate ???
    // <<< THIS NEEDS CONSIDERABLE REWORK BEFORE IT IS CORRECT AGAIN
    debugger;
    serious("healthMutateStep() needs work");
    for (var o in currentObjects) {
        var dispobj = currentObjects[o].genes;
        if (!dispobj.hoverHealth) dispobj.hoverHealth = healthMutateSettings.initialHealth;
        if (o === healthTarget) {
            dispobj.hoverHealth += healthMutateSettings.boostRate;
            dispobj.hoverHealth = Math.max(dispobj.hoverHealth, healthMutateSettings.maxHealth);
        }
        else {
            dispobj.hoverHealth -= healthMutateSettings.decayRate;
            if (dispobj.hoverHealth <= 0) {
                ///??? what genes?
                ///???mutateReplace(genes);
                ///???setgenes(i, genes);
                dispobj.hoverHealth = healthMutateSettings.initialHealth;
            }
        }
    }
    showObjectHealth();
}

/** show object health, may  be overridden */
//function showObjectHealth() {}


/** find the least recently touched object */
function lru() {
    var oldest;
    for (var o in currentObjects) {
        var dispobj = currentObjects[o];
        if (dispobj.vn !== dustbinvp
            && dispobj.vn !== mainvp
            && dispobj.vn !== -1
            && dispobj.vn > reserveSlots
            && dispobj !== extraDispobj
            && (!oldest || dispobj.lastTouchedDate < oldest.lastTouchedDate)
        )
            oldest = dispobj;
    }
    return oldest;
}

