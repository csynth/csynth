/**
 * @author mrdoob / http://mrdoob.com
 * @author stewdio / http://stewd.io
 */
// heavy change sjpt to try to match VR and XR;
// should be temporary until three.js XR  inputs better sorted ??? 29/07/19
var THREE, V, renderer, msgfix, log;

THREE.ViveController = function ( id ) {
	if (+THREE.REVISION > 142) {
		const xx = new THREE.Object3D();
		Object.assign(this, xx);
	} else {
		THREE.Object3D.call( this );
	}

	var scope = this;
	var gamepad;

	var axes = [0, 0];
	var thumbpadIsPressed = false;
	var triggerIsPressed = false;
	var gripsArePressed = false;
	var menuIsPressed = false;

	this.slot = undefined; // sjpt, to reassign virtual ViveController

	function findGamepad( gid ) {
		// now that menuMode has been tidied up so button.pressed is more consistent
		// it is probably ok to use V.gps[gid] whether or not we are in XR.
		// We may still need some work in case controllers swap hands or otherwise change dynamically.

		// Also, we may want to remove ViveController completely to keep more in line with later three.js
		// BUT data.guiVR uses ViveController so not necessarily a straightforward change

		// todo remove/tidy Nov 2020
		// if (renderer. vr.is xr)
			return V.gps[gid];

		// // Iterate across gamepads as Vive Controllers may not be
		// // in position 0 and 1.
		// var gamepads = V.gamepads; // navigator.getGamepads(); probably OK to repeat call but we want consistent values
		// if (this.slot !== undefined) return gamepads[this.slot];  // sjpt, to allow for virtual controller

		// for ( var i = 0, j = 0; i < 4; i ++ ) {
		// 	var _gamepad = gamepads[i];
		// 	if ( _gamepad && ( _gamepad.id.startsWith('OpenVR') || _gamepad.id === 'Oculus Touch (Left)' || _gamepad.id === 'Oculus Touch (Right)' ) ) {
		// 		if ( j === gid )
		// 			return _gamepad;
		// 		j ++;
		// 	}
		// }
	}

	this.matrixAutoUpdate = false;
	this.standingMatrix = new THREE.Matrix4();

	this.getGamepad = function () {
		return gamepad;
	};

	this.getButtonState = function ( button ) {
		if ( button === 'thumbpad' ) return thumbpadIsPressed;
		if ( button === 'trigger' ) return triggerIsPressed;
		if ( button === 'grips' ) return gripsArePressed;
		if ( button === 'menu' ) return menuIsPressed;
	};

	this.update = function () {
		gamepad = findGamepad( id );
		if (!gamepad) return;  // eg if emulating with mouse
        // patch for Chrome issue sometimes not reporting Vive gamepads with 4 buttons
		if (gamepad.buttons.length < 4) { msgfix('unexpected gamepad buttons', gamepad.buttons.length); return; }

		if ( gamepad !== undefined && gamepad.pose !== undefined ) {
			if ( gamepad.pose === null ) return; // No user action yet
			//  Position and orientation.
			var pose = gamepad.pose;

			if ( pose.position !== null ) scope.position.fromArray( pose.position );
			if ( pose.orientation !== null ) scope.quaternion.fromArray( pose.orientation );
			scope.matrix.compose( scope.position, scope.quaternion, scope.scale );
			scope.matrix.multiplyMatrices( scope.standingMatrix, scope.matrix );
			scope.matrixWorldNeedsUpdate = true;
			scope.visible = true;

			//  Thumbpad and Buttons.
			if ( axes[0] !== gamepad.axes[0] || axes[1] !== gamepad.axes[1] ) {
				axes[0] = gamepad.axes[0]; //  X axis: -1 = Left, +1 = Right.
				axes[1] = gamepad.axes[1]; //  Y axis: -1 = Bottom, +1 = Top.
				scope.dispatchEvent( { type: 'axischanged', axes: axes } );
			}
			// todo remove/tidy Nov 2020 const [trig, pad, side, menu] = (renderer. vr.is xr) ? [0,1,2,3] : [1,0,2,3];
			const [trig, pad, side, menu] = [0,1,2,3];

			if ( thumbpadIsPressed !== gamepad.buttons[pad].pressed ) {
				thumbpadIsPressed = gamepad.buttons[pad].pressed;
				scope.dispatchEvent( { type: thumbpadIsPressed ? 'thumbpaddown' : 'thumbpadup' } );
			}

			if ( triggerIsPressed !== gamepad.buttons[trig].pressed ) {
				triggerIsPressed = gamepad.buttons[trig].pressed;
				scope.dispatchEvent( { type: triggerIsPressed ? 'triggerdown' : 'triggerup' } );
			}

			if ( gripsArePressed !== gamepad.buttons[side].pressed ) {
				gripsArePressed = gamepad.buttons[side].pressed;
				scope.dispatchEvent( { type: gripsArePressed ? 'gripsdown' : 'gripsup' } );
			}

			if ( menuIsPressed !== gamepad.buttons[menu].pressed ) {
				menuIsPressed = gamepad.buttons[menu].pressed;
				scope.dispatchEvent( { type: menuIsPressed ? 'menudown' : 'menuup' } );
			}

		} else {
			scope.visible = false;
		}
	};
};

THREE.ViveController.prototype = Object.create( THREE.Object3D.prototype );
THREE.ViveController.prototype.constructor = THREE.ViveController;
