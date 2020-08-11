"use strict";
/*
 * Simple script to fake the simple controls we need and serialize them to the other window
 *
 */
var trysetele, tryseteleval, newframe, stepeleval, trygetele;

var UIController = new function() {
    var UI = this;
    // speed control 0 for mutatio, 1 for rotation
    // the middle value ( 1 ) is for the default speed
    UI.m_aSpeedControl = {animSpeed:[0.0,0.25, 0.0], xzrot:[0.0,0.25, 0.0]};
    UI.m_nSpeedFactor = 2.0;

    UI.m_speedStepMax = 4;                             // how many steps untill we hit the max speed cap
    UI.m_speedDelta = { animSpeed:0, xzrot:0 };        // ( ( default * speedFactor) - default ) / 4;
    UI.m_curSpeedSteps = { animSpeed:0, xzrot:0 };    // current speed steps
    UI.m_curSpeed = { animSpeed:0, xzrot:0 };


    UI.ClearButtons = function() {
        var overlay = document.getElementById('UI_overlay');
        var children  = overlay.children;
        for( var i = 1; i < children.length; i++ ) {
            UI.DepressChildren( children[i] );
        }
    };

    //
    UI.InitSpeedValues = function( strObj, defaultSpeed )    {
        defaultSpeed = parseFloat( defaultSpeed );
        UI.m_aSpeedControl[strObj][0] = defaultSpeed / UI.m_nSpeedFactor;
        UI.m_aSpeedControl[strObj][1] = 0;
        UI.m_aSpeedControl[strObj][2] = defaultSpeed;
        UI.m_aSpeedControl[strObj][3] = defaultSpeed * UI.m_nSpeedFactor;

        UI.m_speedDelta[strObj] =  defaultSpeed / UI.m_speedStepMax;
        UI.m_curSpeed[strObj] = defaultSpeed + 0.001;
        UI.ClearButtons();
        console.log("set UIController speeds. Default "+strObj+":"+defaultSpeed );
    };

    UI.SetDefaultSpeeds = function() {
        tryseteleval( 'animSpeed', UI.m_aSpeedControl.animSpeed[2] );
        tryseteleval( 'xzrot', UI.m_aSpeedControl.xzrot[2] );
        UI.m_curSpeedSteps.xzrot = 0;
        UI.m_curSpeedSteps.animSpeed = 0;
        UI.ClearButtons();
    };

    UI.DepressChildren = function( elem ) {
        var children  = elem.children;
        for( var i = 0; i < children.length-1; i++ ) {
            var img = children[i].getAttribute('src');
            children[i].setAttribute('src', img.replace("_sel", "_off") );
        }
    };

    UI.Toggle = function( strObj, element ) {
        //console.log( strObj );
        var newv = !trygetele(strObj, "checked");
        trysetele( strObj, "checked", newv );
        var parent = element.parentNode;
        //UI.DepressChildren( parent );

        // set the element as pressed
        var img = element.getAttribute('src');
        if (img) {
            if (newv)
                element.setAttribute('src', img.replace("_off", "_sel") );
            else
                element.setAttribute('src', img.replace("_sel", "_off") );
        } else {
            element.style.color = newv ? '#fff' : '#44f';
        }

        newframe();
    };

    // where direction is -1 or 1
    UI.ChangeSpeed = function( strObj, direction, elem )
    {
        if (typeof strObj !== "string") {
            for (let i=0; i<strObj.length; i++)
                UI.ChangeSpeed(strObj[i], direction, elem);
            return;
        }
        stepeleval(strObj, direction);
        if( elem !== undefined )
        {
            // clear all buttons
            var parent = elem.parentNode;
            //UI.DepressChildren( parent );

            // set the element as pressed
            var img = elem.getAttribute('src');
            var re = "_off";
            elem.setAttribute('src', img.replace(re, "_sel") );

            setTimeout(function(){ UI.DepressChildren( parent ); }, 350 );
        }
    };
}();

/* not used ??? sjpt 16 Feb 2015 */
var UIDisplay = new function() {
    var UID = this;
    var m_isInitialized = false;
    var m_overlayElement;
    var m_isVisible    = false;

    /* UI display related */
    UID.InitMisc = function()  {
        m_isInitialized = true;
        return;
    };

    UID.SetToolbarDisplay = function( val )
    {
        var disp = val ? 'block' : 'none';
        document.getElementById('UI_overlay').style.display = disp;
    };

    window.addEventListener("load", UID.InitMisc);
}();


