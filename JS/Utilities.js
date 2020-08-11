// misc utility functions that don't fit anywhere else
"use strict";
// to check global variable usage
var CubeMap, THREE, gl, XMLHttpRequest, setBackgroundColor;
var UtilsFUN = function() {
    var u = this;
    u.m_clock = new THREE.Clock();
    u.NullCallback = function(){};


    u.GetDistance = function( point, point1 )
    {
        var dx = point.x - point1.x;
        var dy = point.y - point1.y;
        return Math.sqrt( dx*dx + dy*dy );
    };

    u.Sign = function( number )
    {
        return number?number<0?-1:1:0;
    };
    // converts from hex to rgb colors
    u.HexToRGB = function( hex )
    {
        function cutHex(h) {return (h.charAt(0)==="#") ? h.substring(1,7):h;};
        function hexToR(h) {return parseInt((cutHex(h)).substring(0,2),16);};
        function hexToG(h) {return parseInt((cutHex(h)).substring(2,4),16);};
        function hexToB(h) {return parseInt((cutHex(h)).substring(4,6),16);};

        //var rgb = function() { this.r; this.g; this.b;};
        var rgb = {};
        rgb.r  = hexToR(hex);
        rgb.g = hexToG(hex);
        rgb.b = hexToB(hex);
        return rgb;
    };

    // returns a simple hex color ( nothing prepended) of form xxxxxx as a string
    u.RGBToHex = function(r, g, b)
    {
        var rgb = b | (g << 8) | (r << 16);
        return rgb.toString(16);
    };
    // synchronous get, returns response data
    u.GETsync = function(url)
    {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.send();
        return xhr.responseText;
    };

    // asynchronous get. Passes data to callback on complete
    u.GETasync = function(url, callback)
    {
        callback = callback === null ? u.NullCallback : callback;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onreadystatechange = function(state)
        {
            // on complete, return response to callback
            if(xhr.readyState === 4)
            {
                callback( xhr.responseText );
            }
        };
        xhr.send();
    };
};
var Utils = new UtilsFUN();

var BackgroundFUN = function() {
    var b = this;
    //b.m_data;

    b.ParseBackgroundData = function()
    {

        // CUBEMAP
        CubeMap.Load(b.m_data.cubemap.settings);

        /** foreach default, create option in default textures */
        var defaults = b.m_data.cubemap.saves;
        var i=0;
        var end = defaults.length;
        for(i; i< end; i++)
        {
            var select = document.getElementById("cubeDefaults");
            var option = document.createElement('option');
            option.value = i;
            option.innerHTML = defaults[i].name;
            if (select) select.appendChild(option);
        }
        // COLOR
        setBackgroundColor( Utils.HexToRGB(b.m_data.color) );

        // WATER. TODO, separate
        // color
        // texture

        // etc

    };

    b.LoadCubemapSave = function( index )
    {
        CubeMap.Load(b.m_data.cubemap.saves[index].settings);
    };
    /*     load saved json file */
    b.LoadBackgroundData = function()
    {
        b.m_data = JSON.parse( Utils.GETsync('databackground.txt') );
        //console.log(b.m_data);
        b.ParseBackgroundData();
    };

    b.SaveBackgroundData = function()
    {

    };
    //b.LoadBackgroundData();
};
var Background = new BackgroundFUN();
