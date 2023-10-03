var Maestro, log, msgfix, msgfixerror, msgfixerrorlog, renderVR, dockeydowninner, animateNum, nop, WA, renderer, nircmd,
	cheatxr, W, vpxSceneRenderCamera, startvr, nomess;

var WEBVR = {

	realsetup: function WEBVRsetup( options) {
		if (!options) {
			msgfixerrorlog('VR', "NO XR: navigator.xr.isSessionSupported( 'immersive-vr' ) returned false");
			WEBVR.novr = true;
			return;
		}
		msgfix("VR", 'XR session is supported, F2 or F6 to enter VR, F4 to exit	');
		if (startvr) nomess('force');


		if ( options && options.referenceSpaceType ) {
			renderer.xr.setReferenceSpaceType( options.referenceSpaceType );
		}
		var currentSession = null;
		var pending = false;

		function onSessionStarted( session ) {
			log('requestSession started');
			msgfix("VR", 'session started ok');

			renderer.xr.addEventListener( 'sessionend', onSessionEnded );
			renderer.xr.setSession( session );
			if (cheatxr) renderer.xr.enabled = true;
			currentSession = session;
			pending = false;
			Maestro.trigger('xrsessionstarted');
			renderVR.reenter = false;
			renderer.setAnimationLoop(animateNum);	// sjpt, resart animation after resolution switch
		}
		// WEBVR.onSessionStarted = onSessionStarted;

		function onSessionEnded( event ) {
			renderer.xr.removeEventListener( 'sessionend', onSessionEnded );
			renderer.xr.setSession( null );
			if (cheatxr) renderer.xr.enabled = false;
			currentSession = null;
			if (renderVR.reenter) {
				log('session end, restarting')
				// WEBVR.enter();					// won't work coming from controller?
				nircmd(`sendkey f2 press`);
				renderer.setAnimationLoop(nop);    // don't animate during switch
			}
		}
		// WEBVR.onSessionEnded = onSessionEnded;

		WEBVR.enter = function () {
			if (pending) return;
			if (currentSession !== null ) return(msgfixerrorlog('WEBVR', 'attempt to reenter xr when already in xr'));
			renderer.xr.setFramebufferScaleFactor(renderVR.ratio);
			log('pre-create controllers if necessary, otherwise threee.js does not always see them correctly')
			renderer.xr.getController(0); renderer.xr.getController(1);
			log('requestSession immersive-vr, ratio', renderVR.ratio);
			navigator.xr.requestSession( 'immersive-vr' ).then( onSessionStarted ).catch(onRequestError);
			pending = true;
		}

		WEBVR.exit = function() {
			currentSession.end();
		}

		function onRequestError(e) {
			console.error(msgfixerror('VR', 'WEBXR got an error getting immersive-vr session for XR<br>', e.message));
			pending = false;
		}

	},	// realsetup

	setup: function() {
		if (!navigator.xr) {
			msgfixerrorlog('VR', "WebXR not supported, no VR");
			WEBVR.novr = true;
			return;
		}
		msgfix("VR", 'start setup');
		msgfix("VR", 'check session supported');

		navigator.xr.isSessionSupported( 'immersive-vr' )
			.then( WEBVR.realsetup )
			.catch( (e) => {
				// This catch should never happen,
				// It would happen if 'immersive-vr' weren't even a valid thing to ask about
				// If the is not supported that is handled by giving 'false' to WEBVR.realsetup
				msgfixerrorlog('VR', "'XR not FOUND by navigator.xr.isSessionSupported( 'immersive-vr' )", e);
				WEBVR.novr = true;
			});
	}
};

/** enter and leave xr */
renderVR.xrfs = async function xrenderVRfs(bool = true) {
	if (bool && WEBVR.novr)
		return msgfixerrorlog('XR', "No attempt to enter XR as it isn't available.");
    log('renderVR.xrfs wanted', bool, 'current', renderVR.invr() );
    renderVR.xrfs.lastrequest = bool;       // remembers if we want to be in XR
	if (renderVR.invr() === bool) return;   // already in correct

    if (WEBVR.novr) {
        WA.makevr2 = nop;      //  no point in going on trying
        return;
	}

    log('renderVR.xrfs change', bool);
    // renderer.xr.setFramebufferScaleFactor(renderVR.ratio);
	if (bool) {
		WEBVR.enter();
		const callnum = renderVR.xrfs.startcalls++;
	} else {
		WEBVR.exit();
	}
    if (!bool) return;      // we've asked it to go away, that seems safe

}
renderVR.xrfs.restarts = 0;
renderVR.xrfs.maxrestarts = 10;
renderVR.xrfs.lastRestartTime = 0;
renderVR.xrfs.startcalls = 0;
renderVR.xrfs.state = 'unguarded';


var THREE, camToGenes, renderObj, V, xxxdispobj, cheatxrRenderTarget, genesToCam, serious;
/** main render function  nested in onbefore ~~~ cheatxr
 * Should work even outside VR mode, useful for verification.
 * Note that pcamera is irrelevant/not used. camera refers to global window.camera
*/
function doinsiderender(prenderer, pscene, pcamera, pgeometry, material, pgroup ) {
	const dispobj = xxxdispobj();
	if (renderer !== renderer) serious('??? renderer in doinsiderender')
	// const scamera = camera;
	const rrt = renderer.getRenderTarget() ;
	const srt = renderer.xr.enabled ? rrt || cheatxrRenderTarget : rrt;
	const svp = renderer.getViewport(new THREE.Vector4());
	const scvp = renderer.getCurrentViewport(new THREE.Vector4());
	const xren = renderer.xr.enabled;
	renderer.xr.enabled = false;
	try {
		// if (dispobj.camera) {
		// 	camera = dispobj.camera;
		// 	camToGenes(dispobj.genes);
		// }
		genesToCam(dispobj.genes);

		// renderVR.cameras
//		W.camera.copy(renderVR.cameras.cameras[0]); // ?? input camera will be for copy shader and probably irrelevant, should use cameraL/R if we can find them?
		renderObj(dispobj);
		V.render(dispobj.rt);
		Maestro.trigger('postDispobj', dispobj);
	} catch (e) {
		log("cannot render dispobj", dispobj.vn, e.toString());
		// break;
	} finally {
		//if (dispobj.camera) {
			// camera = scamera;
			camToGenes(dispobj.genes);
		//}
	}
	// ??? other things to restore here ???
	renderer.xr.enabled = xren;
	if (renderer.xr.getBaseLayer) {  // for three150 cheatxr
		const baseLayer = renderer.xr.getBaseLayer()
		if (baseLayer && srt) {
			// baseLayer.setViewport()
			renderer.setRenderTargetFramebuffer( srt, baseLayer.framebuffer );
		}
	}
	if (xren) pcamera.copy(vpxSceneRenderCamera);
	renderer.setRenderTarget(srt);
	renderer.setViewport(scvp);
	if (material.uniforms.intex.value !== dispobj.rt.texture) serious('??? material intex in doinsiderender')
	material.uniforms.intex.value = dispobj.rt.texture
	renderer.xr.enabled = false; //

}
