'use strict';
var projectionWindow, setRes, RPCCall, canvas, canvdblclick, canvmousedown, canvmousemove, canvmouseup, canvclick, canvmouseout, canvmousewheel,
canvoncontextmenu, dockeydown, dockeyup, docmousedown, docmouseup;

var UICom = new function() {
    var UI = this;
    //UI.m_listener;
    //UI.m_domain;
    //UI.m_window;
    //UI.m_path;
    UI.m_isProjVersion = false;

    UI.Init = function()
    {
            UI.m_domain = window.location.origin;
            window.addEventListener("message", UI.MessageHandler, false);

            // TODO, make sure you reinit this window so the windows are in sync.
            //


    };
    UI.DetachControls = function(bool)
    {
            if (bool === false) return;
            if (projectionWindow) return;
            // if we don't provide new window params, the window will open as a tab
            // having a named window means we reuse it
            // defer this, does not work under 13.0 alpha, and only needed here
            UI.m_path = window.location.href.match( /^((http|file).+\/)[^\/]+$/ )[1];
            var url = UI.m_path + "threeProjection.html";
            url = window.location.href + "?projectionWindow=true";
            url = UI.m_path + "threek.html?projectionWindow=true";
            UI.m_window = window.open(url, "Projection_window", 'width=1024,height=768');
            window.setTimeout( function(){ UI.m_window.postMessage("Hello Projection", UI.m_domain);}, 1000);

            // reduce this window's complexity, TODO kill shadows
            setRes(8);
    };

        UI.PassInput = function( func, evt )
        {
            if( UI.m_window )
            {
                if (UI.m_window.closed) { UI.m_window = undefined; return; }
                UI.m_window.FCall( func.name, evt);
            }
            // call our local func
            func(evt);
        };

        UI.CallRemoteNamed = function( funcName, data )
        {
            if( UI.m_window )
            {
                if (UI.m_window.closed) { UI.m_window = undefined; return; }
                UI.m_window.FCall( funcName, data);
            }
        }

        UI.SendMessage = function( data )
        {
            if( !UI.m_window ) return;
            if (UI.m_window.closed) { UI.m_window = undefined; return; }
            UI.m_window.postMessage(data, UI.m_domain);
        };

    UI.MessageHandler = function( event )
    {
        if (event.data.type && event.data.type.startsWith('SS_')) return;  // do not interfere with screen sharing extension
        var func = event.data.func;
        var arg = event.data.arg;
        if (func) {
            console.log(func);
            console.log(arg);
            //func.apply(0, arg);
            RPCCall(func, arg);
        }
    };

        /* common to both windows :)
         *  To be called after the originals have been set in mutbase.js
         */
        UI.HijackInput = function()
        {
            canvas.ondblclick = function(evt) {
                    UICom.PassInput( canvdblclick, evt );
            };
            canvas.onclick =  function(evt) {
                    UICom.PassInput( canvclick, evt );
            };
            canvas.onmousedown =  function(evt) {
                    // disable right click due to long-press issues in chrome
                    // in multitouch this is supposed to perform a right mouse click but
                    // does not call onmouseup on release
                    if( UICom.m_isProjVersion && evt.which === 3 )
                    {
                        return;
                    }
                    UICom.PassInput( canvmousedown, evt );
            };
            canvas.onmouseup = function(evt) {
                    UICom.PassInput( canvmouseup, evt );
            };
            canvas.onmousemove = function(evt) {
                    //console.log("mouse move");
                    UICom.PassInput( canvmousemove, evt );
            };

            canvas.onmouseout = function(evt) {
                    UICom.PassInput( canvmouseout, evt );
            };
            canvas.onmousewheel = function(evt) {
                    UICom.PassInput( canvmousewheel, evt );
            };
            canvas.oncontextmenu = function(evt) {
                    UICom.PassInput( canvoncontextmenu, evt );
            };

            document.onkeydown = function(evt) {
                    UICom.PassInput( dockeydown, evt );
            };  // chrome does not 'see' onkeydown for some elements, including our canvas
            document.onkeyup = function(evt) {
                    UICom.PassInput( dockeyup, evt );
            };
            document.onmousedown = function(evt) {
                    UICom.PassInput( docmousedown, evt );
            };
            document.onmouseup = function(evt) {
                    UICom.PassInput( docmouseup, evt );
            };



        };

        UI.Init();


}();
