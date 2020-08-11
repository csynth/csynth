/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 *
 * Based on @tojiro's vr-samples-utils.js
 */

 var Maestro, log, msgfixerror;

var WEBVR = {

	createButton: function ( renderer, options ) {
		if ( options && options.referenceSpaceType ) {
			renderer.vr.setReferenceSpaceType( options.referenceSpaceType );
		}

		function showEnterXR( device ) {

			var currentSession = null;

			function onSessionStarted( session ) {
				log('requestSession immersive-vr');  // sjpt
				session.addEventListener( 'end', onSessionEnded );
				renderer.vr.setSession( session );
				button.textContent = 'EXIT XR';
				currentSession = session;
				Maestro.trigger('xrsessionstarted');
			}
			WEBVR.onSessionStarted = onSessionStarted;

			function onSessionEnded( event ) {
				// WEBVR.dyingSession = currentSession;
				currentSession.removeEventListener( 'end', onSessionEnded );
				renderer.vr.setSession( null );
				button.textContent = 'ENTER XR';
				currentSession = null;
			}
			WEBVR.onSessionEnded = onSessionEnded;

			//

			button.style.display = 'none'; // sjpt '';

			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';

			button.textContent = 'ENTER XR';

			button.onmouseenter = function () { button.style.opacity = '1.0'; };
			button.onmouseleave = function () { button.style.opacity = '0.5'; };

			WEBVR.onclick = button.onclick = function () {
				if ( currentSession === null ) {
					log('requestSession immersive-vr');  // sjpt
					navigator.xr.requestSession( 'immersive-vr' ).then( onSessionStarted ).catch(onRequestError);
				} else {
					currentSession.end();
				}
			};

			function onRequestError(e) {
				console.error(msgfixerror('xrfs', 'WEBXR got an error getting immersive-vr session for XR'));
			}
		}

		function disableButton() {

			button.style.display = 'none'; // sjpt '';

			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';

			button.onmouseenter = null;
			button.onmouseleave = null;

			button.onclick = null;

		}

		function showXRNotFound() {
			disableButton();
			msgfixerror('VR', "'XR no FOUND by navigator.xr.isSessionSupported( 'immersive-vr' )");
			button.textContent = 'XR NOT FOUND';
			button.style.display = '';
		}

		function stylizeElement( element ) {

			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';

		}

		//?? var xrok = window.allow XR || window.searchValues.allow XR; // sjpt
		//?? if ( xrok && 'xr' in navigator && 'isSessionSupported' in navigator.xr ) {  // sjpt
		var button;
		if (renderer.vr.isxr) {

			WEBVR.button = button = document.createElement( 'button' );
			button.style.display = 'none';

			stylizeElement( button );

			navigator.xr.isSessionSupported( 'immersive-vr' ).then( showEnterXR ).catch( showXRNotFound );

			return button;

		} else {

			var message = document.createElement( 'a' );
			message.href = 'https://webvr.info';
			message.innerHTML = 'WEBVR NOT SUPPORTED';

			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';

			stylizeElement( message );

			return message;

		}

	},

	// DEPRECATED

	checkAvailability: function () {
		console.warn( 'WEBVR.checkAvailability has been deprecated.' );
		return new Promise( function () {} );
	},

	getMessageContainer: function () {
		console.warn( 'WEBVR.getMessageContainer has been deprecated.' );
		return document.createElement( 'div' );
	},

	getButton: function () {
		console.warn( 'WEBVR.getButton has been deprecated.' );
		return document.createElement( 'div' );
	},

	getVRDisplay: function () {
		console.warn( 'WEBVR.getVRDisplay has been deprecated.' );
	}

};
