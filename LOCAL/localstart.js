/*
 * This file helps control startup and the LOCAL directdory can be excluded from Dropbox sync to keep it local/private.
 */
var startobj, kinectJupDyn, W, hostname, appToUse, Maestro, simplemode, initCodeMirror, tranInteractDelay, forcevr,
getserveroao, nwwin, waitfor, SCBuf, NW_SC, noaudio, slowMutate, mutate, setInput, startSC;

var mystart, startvr;

/** this function may be overridden, eg in LOCAL/localstart.js,
 * run at start of init() process */
function localstartEarly() {
    // startobj = "startup";
}

/** this function may be overridden, eg in LOCAL/localstart.js,
 * run at end of init() process */
function localstartLate() {
    if (appToUse !== "Horn") return;

    //if (hostname.startsWith("Fractal") || hostname.startsWith("Peter"))
        initCodeMirror();

    if (startobj !== "startup") return;
    if (simplemode) return;

    if (hostname === "toddlap" || hostname === "defaulthost")
        tranInteractDelay = 1e97;  // stop autoscale after no interaction


//    if (navigator.appVersion.indexOf("Chrome/30.0") !== -1 || navigator.appVersion.indexOf("Chrome/4") !== -1) {
		//getserveroao("files/Edinburgh.oao");   //machines: "msccge-pc-a" "msccge-pc-b" "msccge-pc-c"
        //PJT adding specific cases for each of those for the Edinburgh Summerhall exhibition.
        //forcevr now more reliable ?
		//if (startvr) setTimeout(forcevr, 1000);
		//if (startvr) setTimeout(forcevr, 10000);

        if (mystart) {
            getserveroao(mystart);
		} else if (startvr) {
            getserveroao("gallery/GalaxRefl.oao");
            //getserveroao("gallery/Galax1a inside.oao");
            //getserveroao("gallery/Tempest3ax8.oao");
            //getserveroao("gallery/testsave.oao");

        // these are needed at asartup where SteamVR takes time to start
        // We can be in VR mode with dual screen and presenting,
        // but if we got our inital full screen in too early no image on headset.
        // I haven't yet found a reliable test for this, so using horrible timeout below.
            //setTimeout(function() {renderVR.xrfs(false);}, 5000);
            //setTimeout(renderVR.xrfs, 7000);
        } else if (hostname === "xtoddlap") {
            getserveroao("gallery/newFeedback.oao");	// simple for fast tests
        } else if (hostname === "toddlap" || hostname === "defaulthost" || hostname === 'Peters-MacBook-Pro.local') {
            getserveroao("gallery/startup.oao");	// simple for fast tests
        } else if (hostname === "Todd") {
            getserveroao("gallery/startup.oao");	// simple for fast tests
            //getserveroao("gallery/perfmirror.oao");	// performance tests
		//	setSize(800, 600);
        } else if (hostname === "xtoddlap" && nwwin){
            waitfor(function(){getserveroao("gallery/EdScopes.oao");}, function() {return SCBuf || NW_SC.nodevice || noaudio });
            //setTimeout(sizekill, 100);
            setTimeout( function() {
                setInput(W.fullvp, false);
                setInput(W.projvp, false);
                nwwin.enterFullscreen();
            }, 5000);

        } else if (hostname === "xxxmsccge-pc-a" || hostname === "toddlap"){
            //make this use an audio version.
            //getserveroao("gallery/summerRecursePopulated.oao"); //for testing...
            //getserveroao("gallery/EdinburghAU0_00.oao"); //SCBuf undefined... maybe put in a setTimeout???
            //better in scReady maybe, but that only queues one function... this seems ok.
			//setTimeout(function(){getserveroao("gallery/EdinburghAUPopulated.oao");}, 5000);
            waitfor(function(){getserveroao("gallery/Aug15A.oao");}, function() {return SCBuf  || NW_SC.nodevice || noaudio });

			//getserveroao("gallery/Edinburgh.oao");
        } else if (hostname === "msccge-pc-b"){
            //should be all ok... no audio for this machine.
            //getserveroao("gallery/Edinburgh.oao");
			getserveroao("gallery/ediPCB.oao");
        } else if (hostname === "msccge-pc-c"){
            getserveroao("gallery/ediPCC.oao");
        } else if (hostname === "DESKTOP-U2FR2J8") { // || hostname === "WINDOWS-4PQGKTN"){  // William machine in Hove with 960 gpu, or GS 1080
            getserveroao("gallery/York_15x_NewS2.oao");
            //if (!nwwin) renderVR.xrfs(true);
            //setTimeout(renderVR.xrfs, 1000);
            //setTimeout(renderVR.xrfs, 2000);
        } else if (false) {
            getserveroao("gallery/Edinburgh.oao");	// serious for exhibition etc
            Maestro.on("postframe", function() {
                slowMutate = false;
                mutate();
                slowMutate = true;
            }, undefined, true);
        } else {
            getserveroao("gallery/startup.oao");	// simple for fast tests
            // waitfor(function(){getserveroao("gallery/Aug15.oao");}, function() {return SCBuf || NW_SC.nodevice || noaudio });
            //getserveroao("gallery/Aug15.oao");	// serious for exhibition etc
            // getserveroao("gallery/Edinburgh.oao");	// serious for exhibition etc
        }
//    } else {
//        getserveroao("gallery/startup.oao");	// simple for fast tests
//        log("do not attempt default kinectJupDyn.setup(); on this browser " + navigator.appVersion);
//    }
    // if (!startvr) start SC();  // if startvr wait till vive known to be ready
    // leave start SC to VTinit so it is all in one place
    //var editor = CodeMirror.fromTextArea(document.getElementById("tranrulebox"));
	// do anyway after 10 seconds setInterval(noCanvasCursor, 1000);
    //OrgAud.init();
    //Cilly.maestro_init();
}
