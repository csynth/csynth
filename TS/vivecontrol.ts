'use strict';

// BUT we see something different in Chrome and defined in https://w3c.github.io/gamepad/#dom-gamepad
//import "webxr";
//import {THREE} from './tomodule.js';    // '.js' needed because of typescript rules we don't understand

/****
Summary of vivecontrol functions:
~~
clear space around camera and right controller
suppress _uXrot etc
keep wall and audio mutating always
lights based on camera and right controller
room and height position constraints
cutx, cuty

button handling ...
resets / assignment of (re)connected controllers.
setting master volume (might be an idea to move that...)

***/

/** V is a holder for scoping variables, Vtype defines those */
type Vtype = {skip?, render?, currentdb?, masterdb?,
    vraudioframe?, wallframe?, trigger?, rightb?, leftb?, nocamscene?, camscene?,
    clickmaxtime?, tempq?, tempo3?, gp0mat?, tempv?, gpRok?, gpLok?, framepick?, rawscene?,gpBothok?,controllerDiffs?,
    recentre?,headlight?,torchlift?,resting?,restbutton?,pretendbutton?, forceup?,rawcam?,left?,up?,forward?,tempmatrix?,fromwall?,
    roomsize?,usewall?,forceheight?,baseroomsize?,keepinroom?,putinroom?,putinroomh?,gp0pos?,torchlight?,useorientation?,gp1pos?,
    lastRealInteract?,usepan?, alwaysRot?, tempmycam3?,controllersForShape?,effect?,animSpeedFactor?,staticSpeedMax?,
    rotateSpeedMax?,eul?,tempm2?,minroomsize?,maxroomsize?,userooms?,newroom?,roomx?,roomz?,forwardspeed?,framesinroom?,
    oldtouched?,oldpressed?, waitForRotAfterInteract?, rampUpRot?, homeprob?, alwaysShowRender?, depthTest?, setupPointerForFrame?,
    raylength?,boxz?,renderDepthFunc?,BypassRightLaser?,
    BypassLeftLaser?,nocamcamera?, audioMutateSpeed?, wallMutateSpeed?, triggerMutateSpeed?, nextobj?, smooth?, newobj?,objscale?,
    setobjscale?,skipactions?,deltaStack?,moveByController?,gui?,deltaBend?,deltaTwist?,controllerLen?,startgenes?,
    showbigcontrollers?,ppp?,bigscene?,realgroup?,con1?,con2?,BypassHammer?,usecentre?,pickfun?,
    ignoreBadMouse?,deltaShine?,deltaTexscale?,deltaGloss?,usegprascam?,setguivisible?, flyy?, offb?, mentime?, mendamp?, laserRotateModifier?,
    still?, saveAnimStep?, lastPressedFrame?, angleOptions?, setCamLights?, lightGroup?, setCamLightsFromGenes?,
    ambientlight?, rotrate?, saogui?, gamepads?, modesgui?, nosetroomsize?, noleftpan?, noleftorient?,
    rightRayColor?, leftRayColor?, rayOpacity?, wallAspect?, skipRightExperience?, renderNocam?,
    dummygp?: OrgGP,
    getXrGamepads? : ()=>OrgGP[],
    gps? : OrgGP[],
    gpR? : OrgGP,
    gpL? : OrgGP,

    gpx?: GPX,
    buttons?:string[],
    usePrecamTexture?: boolean,
    precamRT?: THREE.WebGLRenderTarget
    }

type GPX = {lastNewpressButton, lastNewpressFrame, gpR, gpRok, gpL, gpLok, gpBothok}

const _navigatorGetVRDisplays = (navigator as any).getVRDisplays;

// this is the pose we use in most of Organic (historic reasons)
type OrgGPPose = {
    rayMatrix: THREE.Matrix4;
    poseMatrix: THREE.Matrix4;
    position: [N,N,N];
    hasPosition: boolean;
    orientation: N[]; // [N,N,N,N];  // quaternion.toArray returns generic array length
    hasOrientation: boolean;
    visible: boolean;
    linearVelocity: [N,N,N];
    angularVelocity: N[]; // [N,N,N,N];
}

// this is a compromise between the correct XR Gamepad interface and Gamepad API interface(not properly defined in webxr.d.ts)
// this should be removed to use the 'real' one once the underlying webxr definitions are corrected
interface XRGamepad {
    readonly id: string;
    readonly index: N;  // long
    readonly connected: boolean;
    readonly timestamp: DOMHighResTimeStamp;
    readonly mapping: GamepadMappingType;
    readonly axes: ReadonlyArray<number>; // Float32Array;  // FrozenArray<double>;
    readonly buttons: ReadonlyArray<GamepadButton>; // GamepadButton[]; // FrozenArray<GamepadButton>;
}

// this 'hides' the incorrect Gamepad API (navigator.getGamepads()) and exposes the correct XR one
// interface Gamepad extends XRGamepad {};

/** this is the gamepad as we use it in Organic */
interface OrgGP extends XRGamepad {
    raymatrix: THREE.Matrix4,
    poseMatrix: THREE.Matrix4,
    pose?: OrgGPPose,
    laserx?,
    menuMode?,
    hand: string,
    threeObject: ViveController,

    trigger: GamepadButton, abovepadbutton: GamepadButton, sidebutton: GamepadButton,
    ok: boolean,
    axesbias: [N,N],
    axesx: [N,N],
    drawmat: THREE.LineBasicMaterial,
    drawmat2: THREE.MeshBasicMaterial,
    meshray: THREE.Line,
    meshbox: THREE.Mesh,

    reduceBaitDist: any, // used for tadpoles
    bigcontroller: THREE.Object3D,
    baitPosition: THREE.Vector3,
    pad
};

interface ViveController extends THREE.Object3D {
    slot,
    update,
    laserRotateModifier
}

/** these are our extensions to standard GamepadButton */
interface GamepadButton {
    lastpressed: boolean,   // was this button pressed in the previous frame
    lasttouched: boolean,   // time last touched in the previous frame
    lastvalue: N,           // value seen in previous frame
    menuMode: boolean,      // is this
    newpress: boolean,      // has the button been newly pressed this frame
    presstime, N,           // time last pressed
    presslength: N,
    presshold: boolean,     // is the button in a presshold state
    released: boolean,
    releasetime: N,
    newtouch: boolean,
    untouch: boolean,
    zeroed: boolean,
    clicked: boolean,
}

var V:Vtype = {} as any;

//??? experiment namespace VC {

var _boxsize = 500;
function vivecontrol() {
    //if (!W.currentHset) return;  // eg for fano

    // The initial code here should get done each frame regardless of Vive, VR etc
    // The should probably be in another method in another file. sjpt 8 July 22
    addvirtualgenes();

    //######## these need to work even when not doing vive stuff, should move elsewhere
    uniforms.clearposA0.value.copy(camera.position);  // just once while camera still centre camera
    uniforms.clearposA1.value.copy(camera.position);  // just once while camera still centre camera
    if (!V.offb) V.offb = {x: 200, y: -100, z:200};   // should allow for view rotation
    uniforms.clearposB0.value.addVectors(camera.position, V.offb);  // in case no live controllers
    uniforms.clearposB1.value.copy(uniforms.clearposB0.value);  // in case no live controllers
    // temp experiment for ellipsoid cut
    //uniforms.clearposA0.value.z = 0;
    //uniforms.clearposA1.value.z = 0;
    //uniforms.clearposA1.value.x += kkk;
    // msgfix('shrinkradii', currentGenes.shrinkradiusA, currentGenes.shrinkradiusB);

    // V.currentdb should be echo of master.parms.db, but ...??? keep it local
    if (V.currentdb !== undefined && V.currentdb !== V.masterdb) {
        if (V.currentdb < V.masterdb) V.currentdb += 1;
        else V.currentdb = V.masterdb;
        try {
            setMasterVolume(V.currentdb);
        } catch(eee) {
        }
    }

    //XXX: TODO: properly change the way control schemes are configured.
    if (framenum % V.framepick === 0 && oxcsynth) {
        if (V.gpR && V.gpR.menuMode) {

        } else {
            vivepick();
        }
    }


    if (!renderer.xr.getSession()) return;     // wait till XR/XR details properly initialized
    vivepatch();    // patch models designed outside VR for vr
    vrresting();    // check for resting and take appropriate action

    if (isNaN(currentGenes._uScale)) currentGenes._uScale = 1;

    // Make a consistent copy of the gamepads, which we can annotate as we need
    // Always available, even if no significant content
    // Needed because the objects returned from getGamepads sometimes shift around.
    // The copy won't have correct class structures but will have all the right fields
    //
    // We have a dummy extra one V.gps[4] for the case of keyboard simulation
    if (!V.gps) V.gps = [
        {buttons:[{},{},{},{},{},{},{}], raymatrix: new THREE.Matrix4(), poseMatrix: new THREE.Matrix4()},
        {buttons:[{},{},{},{},{},{},{}], raymatrix: new THREE.Matrix4(), poseMatrix: new THREE.Matrix4()},
        {buttons:[{},{},{},{},{},{},{}], raymatrix: new THREE.Matrix4(), poseMatrix: new THREE.Matrix4()},
        {buttons:[{},{},{},{},{},{},{}], raymatrix: new THREE.Matrix4(), poseMatrix: new THREE.Matrix4()},
        {buttons:[{},{},{},{},{},{},{}], raymatrix: new THREE.Matrix4(), poseMatrix: new THREE.Matrix4()}
    ] as any;



    if (V.gpR) uniforms.gpRmat.value.copy(V.gpR.raymatrix);
    if (V.gpL) uniforms.gpLmat.value.copy(V.gpL.raymatrix);

    if (V.skip) return;

    // if (!_navigatorGetVRDisplays) return; // todo add explicit alternatives for no vive


    // we never want these for VR, they just confuse the transforms
    currentGenes._uXrot = currentGenes._uYrot = currentGenes._uZrot = 0;
    // currently only works in VR with cubic walls (?non-cubic seems ok, sjpt 6/2/20)
    // aspect -1 means use stated aspect not compensated by'screen' aspect
    currentGenes.wallAspect = V.wallAspect !== undefined ? V.wallAspect : -1;

    // for always animate audio and wall
    V.vraudioframe();
    V.wallframe();

    tranInteractDelay = 1e99;  // we will always count as interacting
    genesToCam(currentGenes); // all this works using camera

    var ogps = V.getXrGamepads();
    if (!V.buttons) return;     // not got any gamepads (yet)

    // keyboard simulation
    //    if (!V.dummygp) {
        V.dummygp = { buttons:[{},{},{},{},{},{},{}], pose: { position: [1,0,0], orientation: [0,0,0,1]  }, axes: [0,0] } as any;
    //    }
    //??? if (!renderVR.my cam) renderVR.my cam = new THREE.Matrix4();
    (V.dummygp.buttons[V.trigger] as any).pressed = keysdown[0] === 'B';
    (V.dummygp.buttons[V.trigger] as any).value = +(keysdown[0] === 'B');

    if (keysdown[0] === 'B')
        V.rightb = ogps.length;
    else if (V.rightb === ogps.length)
        V.rightb = -1;


    // copy from real gps (ogps) to ngps, and include dummy as well
    // also perform some extra details to help check for changes etc
    var ngps = V.gps;
    for (let gpn = 0; gpn < ogps.length + 1; gpn++) {
        var ogp = gpn === ogps.length ? V.dummygp : ogps[gpn];
        if (ogp) {
            var ngp = ngps[gpn];
            ngp.menuMode = ngp.laserx && ngp.laserx.visible;            // record gamepad being used for menu
            for (let f in  ogp) if (f !== 'buttons') ngp[f] = ogp[f];
            //April 2021: serious: ogp.buttons is undefined
            //looks as though we need ogp.gamepad.buttons instead, but then need to grok surrounding logic.
            // const ogpTyped: THREE.XRInputSource = ogp as THREE.XRInputSource;

            for (let bn = 0; bn < Math.min(ogp.buttons.length, ngp.buttons.length); bn++) {
                var ob = ogp.buttons[bn];
                var nb = ngp.buttons[bn];
                nb.lastpressed = nb.pressed;
                nb.lasttouched = nb.touched;
                nb.lastvalue = nb.value;
                nb.menuMode = ngp.menuMode && bn === V.trigger; // to use to hide trigger actions when in menu

                for (let f in ob) nb[f] = ob[f];
                // menuMode starts at a new press on the menu
                // and stops when the button is released
                // The logic below keeps track of menuMode and disables press in menuMode
                (nb as any).touched = ob.value > 0.05;  // Vive often gets false touch with sticky keys
				// old way to supress menu trigger (pre 21/10/2019
				// caused confusion because of different uses of touch
				// so now we just set menuMode and tests where needed.
				// To remove Dec 2019 >>> TODO
                // if (bn === V.trigger) {
                //     if (V.gui && V.gui.visible && nb.pressed ) {
                //         if (!nb.lastpressed && ngp.laserx && ngp.laserx.visible)
                //             ngp.menuMode = true;    // just pressed in menu, so start menuMode
                //         if (ngp.menuMode) {
                //             nb.pressed = false;     // disable triggers during menu up
                //             nb.touched = false;     // disable triggers during menu up
                //         }
                //     } else {                        // either no menu or not pressed must mean not menuMode
                //         ngp.menuMode = false;
                //     }
                // }
            }
            // patch for breaking change in Chrome reporting of gamepads, sjpt 10/08/2018
            // to review when the gamepad api definitions are clear.
            if (ogp.buttons[1].value === 0 && ogp.axes[2]) (ngp.buttons[1] as any).value = ogp.axes[2];
        }
    }
    var gps = ngps;


    // establish active controllers, also check in case we don't have necessary extensions
    if (!gps[V.rightb] || !gps[V.rightb].pose || !gps[V.rightb].pose.position) {  // full gps, dummy may be used
        V.rightb = -1;
        for (let vv = 0; vv < ogps.length; vv++) {
            if (!ogps[vv]) continue;
            if (!ogps[vv].pose) {
                msgfixerror('bad gamepad'+vv, 'gamepads found but no pose, you may need to enable <b>chrome://flags/#enable-gamepad-extensions</b>' +
                    '<br><a href="chrome://flags/#enable-gamepad-extensions">COPY and PASTE this link</a>');
            } else if(!ogps[vv].pose.position){
                msgfixerror('bad gamepad'+vv, 'gamepads pose position null');
                // gps[vv].pose.position = [0,0,0];  // << may not be valid
            } else if(isNaN(ogps[vv].pose.position[0])){
                msgfixerror('bad gamepad'+vv, 'gamepads pose position NaN, assume 0');
                gps[vv].pose.position = [0,0,0];  // << may not be valid
            } else {
                msgfixerror('bad gamepad'+vv);
            }
            if (vv !== V.leftb && ogps[vv].pose && ogps[vv].pose.position) {
                V.rightb = vv;
                break;
            }
        }
    }
    if (!ogps[V.leftb] || !ogps[V.leftb].pose || !ogps[V.leftb].pose.position) {
        V.leftb = -1;
        for (let vv = 0; vv < ogps.length; vv++) {
            if (!ogps[vv]) continue;
            if (vv !== V.rightb && ogps[vv].pose && ogps[vv].pose.position) {
                V.leftb = vv;
                break;
            }
        }
    }

    /** check for changes and prepare derived details such as newpress etc, return true if active  */
    function newvals(gp: OrgGP, hand: string) {
        if (!gp) return false;
        if (!(gp.pose && gp.pose.position)) {gp.ok = false; return false; }
        gp.hand = hand;
        if (!gp.threeObject) {
            const right = hand === 'right';
            const index = right ? V.rightb : V.leftb;
            //Also pass in slotOff parameters for use in event callbacks
            //TODO: rather than have these numbers hardcoded, keep them in V.rightSlotOff or something
            const slotOff = right ? 0 : 8;
            const slotOffMat = right ? 4 : 12;
            initThreeViveObj(gp, index, slotOff, slotOffMat, hand);
            // if (!right && CSynth && CSynth.GCM){
            //     log("Attaching GCM");
            //     V.nocamscene.remove(CSynth.GCM);
            //     gp.threeObject.add(CSynth.GCM);
            // }
            makePointerGraph(gp);
        }

        // make sure ViveController set to correct real slot
        // pending
        //if (hand === 'right')
        //    V.controller1.slot = gp.index;
        //else
        //    V.controller2.slot = gp.index;
        gp.threeObject.slot = gp.index;

        var a0 = Math.abs(gp.axes[0]), a1 = Math.abs(gp.axes[1]);
        var s0 = Math.sign(gp.axes[0]), s1 = Math.sign(gp.axes[1]);
        gp.axesx = (a0 < 0.5 && a1 < 0.5) ? [0,0] :  // centre
            (a0 > a1) ? [s0, 0] : [0, s1];          // one of four top/bot/left/right
        gp.axesbias = axsep(gp.axes);  // axes with bias

        for (let i=0; i<gp.buttons.length; i++) {
            var but = V.buttons[i];  // button name
            var b = gp.buttons[i];
            b.newpress = b.pressed && !b.lastpressed;
            if (b.newpress) {
                b.presstime = frametime;
                b.presslength = 0;
                msgfix('presstime', b.presstime, 'ind', gp.index, 'but', but);
                V.gpx.lastNewpressButton = b;
                V.gpx.lastNewpressFrame = frametime;
                interactDownTime = Date.now();
            }
            if (b.pressed) {
                b.presslength = frametime - b.presstime;
                V.lastPressedFrame = frametime;
            }
            b.presshold = b.pressed && b.presslength > V.clickmaxtime;
            b.released = !b.pressed && b.lastpressed;
            if (b.released) b.releasetime = frametime;
            b.newtouch = b.touched && !b.lasttouched;
            b.untouch = !b.touched && b.lasttouched;
            b.zeroed = b.lastvalue > 0.01 && b.value < 0.01;   // used as touched does not always go to zero
            b.clicked = (b.released && b.presslength < V.clickmaxtime) || (V.clickmaxtime < 0 && b.newpress);

            var key = hand + but;
            var dir = 1;
            var val = 1;
            if (but === 'pad') {  // 0 is the pad and associated axes
                key += (gp.axesx[0] ? 'lr' : '') + (gp.axesx[1] ? 'bt' : '');
                val = gp.axesbias[0] + gp.axesbias[1];  // at least one of those will be 0
                dir = val < 0 ? -1 : 1;
            }
            const tkey = 'gp_' + key;

            if (b.clicked && !b.menuMode) {
                msgfix('button click', key, dir, hand, but, gp.axesx, frametime);
                vrclick(b, key, dir, val, gp);
                Maestro.trigger(tkey);
            }
            if (b.newpress && !b.menuMode) {
                msgfix('button newpress', key, dir, hand, but, gp.axesx);
                vrnewpress(b, key, dir, val);
                Maestro.trigger(tkey);
            }
            if (b.presshold && !b.menuMode) {
                msgfix('button presshold', key, dir, hand, but, gp.axesx);
                vrpresshold(b, key, dir, val);
                Maestro.trigger(tkey);
            }
        }

        // now establish controller pose as matrix
        var gpp = gp.pose.position;
        var ppo = gp.pose.orientation;
        //V.tempq.set(ppo[0], ppo[1], ppo[2], ppo[3]);
        //V.tempo3.setRotationFromQuaternion(V.tempq);
        V.tempo3.quaternion.set(ppo[0], ppo[1], ppo[2], ppo[3]);
        //maybe consider just having an angle property rather than quaternion
        if (V.laserRotateModifier) V.tempo3.quaternion.multiply(V.laserRotateModifier);
        V.tempo3.updateMatrix();
        V.gp0mat = V.tempo3.matrix.elements.slice(0);   // remember now we have the matrix for use later
        // SJPT gp0mat is used to keep orientation of gamepad so 'forward' can be relative to pointing direction
        // SJPT but we do need to makie sure we use if for the appropriate controller???
        // PJT gp0mat seemed to smell a bit fishy, but it looks like it's never used, only assigned to.
        // SJPT it will be used if we want to follow controller.
        V.tempo3.matrix.multiply(renderVR.mycam);

        var kk = renderVR.scale;
        V.tempv.set(gpp[0] * kk, gpp[1] * kk, gpp[2] * kk);
        const q = V.tempo3.quaternion;
        V.tempq.set(q.x, q.y, q.z, q.w);
        //V.tempq.set(ppo[0], ppo[1], ppo[2], ppo[3]);
        gp.raymatrix.compose(V.tempv, V.tempq, camera.scale); // camera.scale convenient 1,1,1
        if (!tad || !tad.headResting)   // if this is right move headResting to V
            gp.raymatrix.multiplyMatrices(renderVR.mycam, gp.raymatrix);
        else
            gp.raymatrix.elements[14] += tad.fixpos.z;

        if (V.laserRotateModifier) {
            //set poseMatrix to be similar to how raymatrix would be without the rotateModifier
            V.tempo3.quaternion.set(ppo[0], ppo[1], ppo[2], ppo[3]);
            V.tempo3.updateMatrix();
            V.tempq.set(ppo[0], ppo[1], ppo[2], ppo[3]);
            gp.poseMatrix.compose(V.tempv, V.tempq, camera.scale);
            if (!tad || !tad.headResting)   // if this is right move headResting to V
                gp.poseMatrix.multiplyMatrices(renderVR.mycam, gp.poseMatrix);
            else
                gp.poseMatrix.elements[14] += tad.fixpos.z;

        } else {
            gp.poseMatrix.copy(gp.raymatrix);
        }

        // update() is needed to establish clicks etc so that dat.GUIVR works right
        // raymatrix (now poseMatrix) copy is needed so it registers correctly with different spaces
        gp.threeObject.update();
        gp.threeObject.laserRotateModifier = V.laserRotateModifier;
        gp.threeObject.matrix.copy(gp.poseMatrix);
        gp.ok = true;

        return true;
    }  // newvals

    // establish as much as possible early on for quick out tests and simplicity
    // pending
    function initThreeViveObj(gp: OrgGP, i:N, slotOff, slotOffMat, hand:string) {
        log("initThreeViveObj " + i);
        gp.threeObject = new THREEA.ViveController(i);
        gp.threeObject.name = 'ViveController object ' + hand;
        // if (renderVR. controls) gp.threeObject.standingMatrix = renderVR. controls.getStandingMatrix();

        // todo remove/tidy Nov 2020
        // if (renderer. vr.get Device()) {
        //     let amat = renderer. vr.get Device().stageParameters.sittingToStandingTransform;
        //     gp.threeObject.standingMatrix = new THREE.Matrix4();
        //     gp.threeObject.standingMatrix.elements.set(amat);
        // }

        // the controller threeObject will have the menu attached
        // so adding the threeObject to camscene makes sure the menu is displayed
        V.camscene.add(gp.threeObject); //funny old thing....V

        // enable ray from the threeObject is used by dat.GUIVR raycast into menu
        if (!(hand === 'left' && V.BypassLeftLaser)) {
            gp.laserx = dat.GUIVR.addInputObject(gp.threeObject);
            gp.laserx.name = 'laserx gui ' + hand;
        }
        //??? V.rawscene.add(gp.laserx);

        //gp.threeObject.addEventListener('triggerdown', () => CSynth.select(gp.raymatrix, 0, slotOff, slotOffMat));
        if (CSynth && CSynth.trigger) CSynth.trigger('viveGPInit_'+hand, {gp, slotOff, slotOffMat, hand});


    }

    function makePointerGraph(gp: OrgGP) {
        // cannot use group within rawscene as called twice
        // need to find how to have two different instances in three scene graph ...
        // gp.threeObject = newgroup('threeObject');
        V.raylength = V.raylength || 8; V.boxz = V.boxz || 0.005;
        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,-1,0,0,0]), 3));
        //geom.vert ices.push(new THREE.Vector3());
        //geom.vert ices.push(new THREE.Vector3(1,0,0)); //data not important, will be set dynamically

        //gp.drawmat = new THREE.LineBasicMaterial({blending: THREE.AdditiveBlending, transparent: true});
        gp.drawmat = new THREE.LineBasicMaterial();
        gp.drawmat.depthTest = V.depthTest;
        // V.drawmat.wireframe = true;
        gp.drawmat.color.setRGB(0,0,1);
        gp.meshray = new THREE.Line(geom, gp.drawmat);
        gp.meshray.position.set(0, 0, 0);
        gp.meshray.updateMatrix();
        gp.meshray.updateMatrixWorld(true);
        gp.meshray.matrixAutoUpdate = false;
        gp.threeObject.add(gp.meshray);

		// these measurements are (should be?) in metres
        var geom2 = new THREE.BoxGeometry(0.01, 0.0025, V.boxz);    // n.b. renderVR.scale applied dynamically
        gp.drawmat2 = new THREE.MeshBasicMaterial();
        gp.drawmat2.wireframe = true;
        gp.drawmat2.depthTest = V.depthTest;
        gp.meshbox = new THREE.Mesh(geom2, gp.drawmat2);
        gp.meshbox.matrixAutoUpdate = false;
        gp.threeObject.add(gp.meshbox);

        gp.drawmat.color.copy(gp.hand === "right" ? V.rightRayColor : V.leftRayColor)
        gp.drawmat.opacity = V.rayOpacity; gp.drawmat.transparent = V.rayOpacity !== 1;
        gp.drawmat2.color.setRGB(0.05, 0.05, 0.05);

        /**
        var geom3 = new THREE.SphereGeometry(50, 15,15);
        V.drawmat3 = new THREE.MeshBasicMaterial();
        V.drawmat3.color.setRGB(0.03, 0, 0.03);
        V.drawmat3.wireframe = true;
        V.drawmat3.wireframeLinewidth = 0.3;
        V.mesh3 = new THREE.Mesh(geom3, V.drawmat3);
        V.mesh3.matrixAutoUpdate = false;
        V.threeObject.add(V.mesh3);
        **/

        gp.threeObject.matrixAutoUpdate = false;

        // if we do this at start it seems to hang, limitation of Micro-Apache???
        onframe(() => initControllerRenderingScene(gp), 200);

    }

    var gpR = V.gpx.gpR = V.gpR = gps[V.rightb];
    var gpRok = V.gpx.gpRok = V.gpRok = newvals(gpR, 'right');
    var gpL = V.gpx.gpL = V.gpL = gps[V.leftb];
    var gpLok = V.gpx.gpLok = V.gpLok = newvals(gpL, 'left');
    var gpBothok = V.gpx.gpBothok = V.gpBothok = gpRok && gpLok;

    if (gpBothok) V.controllerDiffs();

    // 0 is flat pad, 1 is trigger, 2 is side button, 3 is above pad button
    // except in VR     V.buttons = ['trigger', 'sidebutton', 'pad', 'abovepadbutton']; // XR
    for (let i = 0; i < V.buttons.length; i++) {
        if (gpR) gpR[V.buttons[i]] = gpR.buttons[i];
        if (gpL) gpL[V.buttons[i]] = gpL.buttons[i];
    }

    //+++++++
    // // This was always slightly questionalble, and now seems broken, 9 Feb 2019
    // var ah = 0.3;  // above head height
    // if (gpR && gpR.trigger.pressed && gpR.pose. position && gpR.pose. position[1] > ah &&
    //     gpL && gpL.trigger.pressed && gpL.pose. position && gpL.pose. position[1] > ah) {
    //     if (gpR.trigger.newpress || gpL.trigger.newpress) {
    //             V.recentre();
    //             // .hapticActuators appears to have been removed from Chrome
    //             // .vibrationActuator has been added, but returns null even with #enable-gamepad-vibration enabled
    //             // gpR.hapticActuators[0].pulse(1, 300);
    //             setTimeout(V.recentre, 200);  // not sure why this helps, but otherwise not reliable recentre >>> TODO
    //             //onframe(V.recentre);  // not enough extra
    //             reforcevr();
    //     }
    //     return;
    // }

    cMap.updateRate = 0; // 5000;  // usually update the feedback every 5 secs, set here in case no left controller
    cMap.renderMap = true;  // should have been set by cubemap code, but not always.  TODO see why not


    /****** light at the camera offset by torchlift *******/
    //########
    if (V.headlight) {
        var m = camera.matrix.elements;
        const k = renderVR.scale / 400;
        currentGenes.light0x = camera.position.x + V.torchlift*k * m[4];
        currentGenes.light0y = camera.position.y + V.torchlift*k * m[5];
        currentGenes.light0z = camera.position.z + V.torchlift*k * m[6];
        var ee = camera.matrix.elements;
        currentGenes.light0dirx = -ee[8];
        currentGenes.light0diry = -ee[9];
        currentGenes.light0dirz = -ee[10];
    }

    organicViveUpdateRightController();
    organicViveUpdateLeftController();
    if (V.resting) {
        V.gpx.lastNewpressButton = V.restbutton;
        V.restbutton.presshold = true;
        V.restbutton.value = 1;

        viveAnim(V.restbutton);
    }
    organicRoomCamera();
    aftercontrol();  // extra features added ater controls done
}  // vivecontrol

const gpx:any = V.gpx = {} as any;


let angleOption = 0;
//slightly weird value; -1.5 seems straight along long edge, 0 for pistol aim direction.
Object.defineProperty(V, 'angleOptions', {
    get: () => { return angleOption },
    set: (newValue) => {
        V.laserRotateModifier = new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(1,0,0), -newValue * Math.PI/6);
        angleOption = newValue;
    }
});
V.angleOptions = angleOption;


V.masterdb = -6;

V.restbutton = {pressed: true, presshold: true};
V.pretendbutton = {};

function organicRoomCamera() {
    // ============================================================================================================

    if (!renderVR.invr()) {  // only cut when in VR
        currentGenes.cutx = 0;
        currentGenes.cuty = 0;
    }

    var d = 400;  // safe distance from centre to be away from wall for various algorithms
    var max = Math.max, min = Math.min, abs = Math.abs;

    /******* allow camera to go from room to room (in x and z) and make new objects ***/
    var dd = d * 1.1;

    if (inputs.animSpeed < 0) setInput(W.animSpeed, 0);
    if (inputs.animSpeed > 0.8) setInput(W.animSpeed, 0.8);


    if (V.forceup && renderVR.camera) {
        renderVR.inv.copy(renderVR.camera.matrix).invert();      // get old inverse  vcam**-1 ... todo optimize this, we usually alreay have it
        var A = renderVR.inv, B = renderVR.camera.matrix;

    ////>> todo V.rawcam === ??? renderVR.mycam
        V.rawcam.matrix.multiplyMatrices(camera.matrix, A);  // compute the raw matrix (without headset)

        var m = V.rawcam.matrix.elements;         // make the raw camera matrix level .... extract matrix and vectors and adjust them
        var left = V.left, up = V.up, forward = V.forward;
        left.set(m[0], m[1], m[2]);
        up.set(m[4], m[5], m[6]);
        forward.set(m[8], m[9], m[10]);

    //        left.y = 0; left.normalize();  // make raw camera level
    //        forward.crossVectors(left, up); forward.normalize();  // and compensate up and forward
    //        up.crossVectors(forward, left); up.normalize();
        up.set(0,1,0);
        forward.crossVectors(left, up); forward.normalize();  // and compensate up and forward
        left.crossVectors(up, forward); left.normalize();

        m[0] = left.x; m[1] = left.y; m[2] = left.z;
        m[4] = up.x; m[5] = up.y; m[6] = up.z;
        m[8] = forward.x; m[9] = forward.y; m[10] = forward.z;

        V.tempmatrix.multiplyMatrices(V.rawcam.matrix, B);  // now compute adjusted full camera rotation
        camera.setRotationFromMatrix(V.tempmatrix);           // and apply it

        // msgfix('headcam', format(renderVR.camera.matrix.elements, 3));
        //msgfix('camera', format(camera.matrix.elements, 3));
        //msgfix('mycamera', format(renderVR.mycam.elements, 3));
    }

    // compute how much of the room I can use
    var fromwall = _boxsize * V.fromwall / V.roomsize;  // _boxsize is room half-size in camera units, so fromwall is dist in camera units
    var usewall = _boxsize - fromwall; // _boxsize - a bit so both eyes inside, maybe the bit needs to adjust with roomsize?
    if (usewall < 0) usewall = 0;  // extreme small room, I'll be forced to centre
    V.usewall = usewall;  // for debug


    if (V.forceheight !== false && renderVR.camera) {
        var baseroomsize = V.baseroomsize/2;  // in each direction from centre
        var basetop = usewall;  // I should not go above this, applies in low rooms
        var roomsize = baseroomsize / renderVR.scale;
        var myRealHeight = V.forceheight + renderVR.camera.position.y / renderVR.scale;  // in metres from real floor
        var myRealCamHeight = myRealHeight - roomsize;
        camera.position.y = myRealCamHeight * renderVR.scale;
        if (camera.position.y > basetop) camera.position.y = basetop;
        //msgfix('real height', myRealHeight, 'roomsize', roomsize, 'realCamHeight', myRealCamHeight, 'camy', camera.position.y);
    }

    //msgfix('renderVR scale', renderVR.scale, 'room size', V.baseroomsize / renderVR.scale);
    //msgfix('uscale', currentGenes._uScale, 'object size', basescale * 2 *  currentGenes._uScale / renderVR.scale);

    //camera.matrix.copy(V.rawcam.matrix);
    //camera.matrix.multiply(renderVR.camera);
    var mmm = currentGenes._rot4_ele;
    var pos = V.tempv.set(mmm[3], mmm[7], mmm[11]).multiplyScalar(currentGenes._uScale);
    var dist = pos.distanceTo(camera.position);
    //msgfix('objcam dist', dist, pos, camera.position);

    // prevent the object centre going out of the room
    V.putinroom(_boxsize, pos);
    pos.multiplyScalar(1 / currentGenes._uScale);
    // ? invalid typescript {x: mmm[3], y: mmm[7], z: mmm[11]} = pos;
    mmm[3] = pos.x; mmm[7] = pos.y; mmm[11] = pos.z;

    if (V.keepinroom === true || (V.keepinroom === 'vr' && renderVR.invr()) ) {  // keep camera in room
        V.putinroomh(usewall, camera.position);
    }

    // genesToCam(currentGenes);
    camera.updateMatrix();
    camera.updateMatrixWorld();

    camToGenes(currentGenes);   // and register the manipulated camera values back in the genes

}
V.fromwall = 0.35;  // real distance I must keep from wall, meters
/// was 0.25 ... should be able to use less (eg 0.15)? check camera.near
// yes; camera.near is part culprit, can't fix till log depth buffer better
// or we bulge walls or ...???


/** update and  use right controller (not used by TAD) */
let organicViveUpdateRightController = function organicViveUpdateRightControllerDefault() {
    if (V.gpRok) {
        const gpR = V.gpR;

        var gpp = gpR.pose.position;
        V.gp0pos.set (gpp[0], gpp[1], gpp[2]);   // for use by audio etc

        var ee = gpR.raymatrix.elements;

        var xx = ee[12];
        var yy = ee[13];
        var zz = ee[14];
        var ll = 0;  // length of ellipse cut
        var dxx = ee[8] * ll;
        var dyy = ee[9] * ll;
        var dzz = ee[10] * ll;
        uniforms.clearposB0.value.set(xx,yy,zz); // clearposB for controller
        uniforms.clearposB1.value.set(xx - dxx,yy - dyy ,zz - dzz); // clearposB for controller

        //#######
        if (V.torchlight) {
            currentGenes.light1dirx = -ee[8];
            currentGenes.light1diry = -ee[9];
            currentGenes.light1dirz = -ee[10];


            currentGenes.light1x = xx; // + camera.position.x;
            currentGenes.light1y = yy; // + camera.position.y;
            currentGenes.light1z = zz; // + camera.position.z;
        }



    // use pad button and position to control movement
        var trigger = gpR.trigger;
        if (trigger.newpress)
            newtarget(trigger);
    //        // this allow interruptions as we pass an interesting point, but has too many bad side-effects for now 22/01/2017
    //        if (trigger.zeroed && frametime > trigger.presstime + V.clickmaxtime*2)
    //            vtarget = {};

        if (!V.resting)
            viveAnim(trigger); // V.gpx.lastNewpressButton); // (gpR.trigger);

        //####
        if (V.useorientation && gpR.pose.angularVelocity && inputs.using4d) {     // compute orientation using delta values, damped by head movement
            var ang = gpR.pose.angularVelocity;
            var k = -Math.PI / 180;
            k = -framedelta / 1000;
            rot4dw(ang[0] * k, ang[1] * k, ang[2] * k);
        }



        // if (gpR.abovepadbutton.pressed) restore_view_etc();


        msgfix('gpR', V.rightb, gpR.hand, gpp, gpR.pose.orientation, gpR.axes, gpR.buttons.map(function(b) { return (b.pressed ? 'pr ' : '.') + (b.touched ? 'tch ' : '.') + format(b.value,3); }));
    } else {   // NOT gpROK
        //#####
        if (_navigatorGetVRDisplays) msgfixerror('gpR', V.rightb, 'missing'); // do not expect gamepads if no VR, may be wrong assumption ???
        const k = renderVR.scale/400;
        currentGenes.light1x = 500*k;
        currentGenes.light1y = 500*k;
        currentGenes.light1z = 500*k;
        currentGenes.light1dirx = -1;
        currentGenes.light1diry = -1;
        currentGenes.light1dirz = -1;

    }  // controller 0
}

/** update and  use left controller (not used by TAD) */
let organicViveUpdateLeftController = function organicViveUpdateLeftControllerDefault() {

    if (V.gpLok) {
        const gpL = V.gpL, gpR = V.gpR;
        var gpp = gpL.pose.position;
        V.gp1pos.set (gpp[0], gpp[1], gpp[2]);   // for use by audio etc


        // we tried experiment where left controller move/rot effect was damped by head movement
        // but that got too confusing and was not helpful, so dampmove was always 0 or 1, now removed
        // note: 14/1/20 pan broken for tadpoles (XR or VR), and also not wanted anyway,
        if (gpL.sidebutton.pressed && !V.noleftpan) {
            //PJT flagging where to look for object rotation
            //hardcoded nature of these behaviours is a slight problem...
            // cMap.updateRate = 0;    // update continuously if left touch .. but we are always updating continuously now?
            V.lastRealInteract = frametime;
            V.useorientation = !V.noleftorient;
            V.usepan = true;
        } else if (V.alwaysRot) {
            V.useorientation = !V.noleftorient;
            V.usepan = false;
        } else {
            V.useorientation = false;
            V.usepan = false;
            /** rotation by centred when not interacting, but do not use, confuses the user (I think)
            However, even with V.usecentre it disturbs cutting etc, so leave for now ** /
            var eltime = frametime - V.lastRealInteract;
            if ( eltime > V.waitForRotAfterInteract) {  // wait rg 10 secs before rotating
                var dyrot = (eltime - V.waitForRotAfterInteract) / V.rampUpRot;  // then ramp up over 5 secs
                if (dyrot > 1) dyrot = 1;
                dyrot *= 2 * Math.PI * framedelta / 40000;  // full rotate in 40 secs
                rotcentre(0, dyrot, 0);
            }
            /**/
        }

        if (V.useorientation || V.usepan) {
            var mycam3 = V.tempmycam3;
            mycam3.setFromMatrix4(renderVR.mycam);
        }

        //###
        if (V.useorientation && gpL.pose.angularVelocity) {     // compute orientation using delta values, damped by head movement
            var ang = gpL.pose.angularVelocity;
            var k = -framedelta / 1000;
            var v = V.tempv;
            v.set(ang[0] * k, ang[1] * k, ang[2] * k);
            v.applyMatrix3(mycam3);

            rotcentre(v.x, v.y, v.z);
        }
        // removed, rotation about natural holding position makes significant movement of controller position point
        // so the 'pure' 3d rotation was destroyed
        //if (V.useorientation && gpL.pose.linearVelocity && inputs.using4d) {     // in 4d, use left move for w
        //    var v = gpL.pose.linearVelocity;
        //    var k = -framedelta / 100;
        //    rot4dw(v[0] * k, v[1] * k, v[2] * k);
        //}

        //###
        if (V.usepan && gpL.pose.linearVelocity && !inputs.using4d) {
            // r should combine 'real' size with ability to do things with huge objects ... todo
            // basescale * 2 *  currentGenes._uScale / renderVR.scale
            var gpv = gpL.pose.linearVelocity;
            msgfix('gpL linvel', gpv);
            var r = framedelta; //  / currentGenes._uScale;

            r *= renderVR.scale;
               r /= currentGenes._uScale;
            r /= V.baseroomsize;     // ?? is this mm to m or is this V.baseroomsize; seems to work ok anyway

            let tv = V.tempv;
            tv.set(gpv[0] * r, gpv[1] * r, gpv[2] * r);
            tv.applyMatrix3(mycam3);

            currentGenes._rot4_ele[3] += tv.x;
            currentGenes._rot4_ele[7] += tv.y;
            currentGenes._rot4_ele[11] += tv.z;
            renderObjHorn.centreOnDisplay = false;  // prevent autoscale overriding me
        }

        /***************************/

        if (gpL.abovepadbutton.pressed) {
            if (gpR && gpR.abovepadbutton.pressed) {
                // // swap was confusing, and especially confused datguivr which didn't see the swap
                // if (gpL.abovepadbutton.newpress) {
                //     var s = V.leftb; V.leftb = V.rightb; V.rightb = s;
                //     msgfix("SWAP", V.rightb, V.leftb);
                // }  // swap buttons, rather force second pressed
                if (gpR.abovepadbutton.newpress || gpL.abovepadbutton.newpress) {
                    vrresetall();
                }
            } else {
                //restore_view_etc();
            }
        }

        /***
        if (gpL.trigger.value > 0.01) { // nb does not reliable go back to 0 when released
            V.controllersForShape();
            target = {};
            setInput(W.animSpeed, V.animSpeedFactor * gpL.trigger.value);
            setInput(W.doAnim, true);
        } else {
            setInput(W.doAnim, false);
        }
        **/
        //if (gpL.trigger.pressed) {  // make unconditional, 21/8/17
            V.controllersForShape(gpL.trigger);
        //}

        msgfix('gpL', V.leftb, gpL.hand, gpp, gpL.pose.orientation, gpL.axes, gpL.buttons.map(function(b) {
            return (b.pressed ? 'pr ' : '.') + (b.touched ? 'tch ' : '.') + format(b.value,3);
        }));
    } else {
           if (_navigatorGetVRDisplays) msgfixerror('gpL', V.leftb, 'missing'); // do not expect gamepads if no VR, may be wrong assumption ???

       //// V.lastgpp1 = undefined;
    } // end controller 1
}

// separate out any axis changes; the lower value will be killed
function axsep(ax): [N,N] {
    var abs = Math.abs;
    var x = ax[0], y = ax[1], abx = abs(x), aby = abs(y);
    //var nx = x * (aby > 0.5 ? 0 : 1 - 2*aby);
    if (abx > aby) y = 0; else x = 0;
    return [x, y];
}

// init vivecontrol initv
V.effect = 0;
V.skip = false;
V.animSpeedFactor = 3;
V.staticSpeedMax = 1/100;
V.rotateSpeedMax = -0.02;
V.rawcam = new THREEA.OrthographicCamera();
V.left = new THREE.Vector3();
V.up = new THREE.Vector3();
V.forward = new THREE.Vector3();
V.tempv = new THREE.Vector3();
V.tempq = new THREE.Quaternion();
V.tempo3 = new THREE.Object3D();
V.eul = new THREE.Euler();
V.tempm2 = new THREE.Matrix4();
V.forceup = true;
V.baseroomsize = _boxsize * 2;  // as defined by room set in CubeMap walls
V.minroomsize = 0.6;
V.maxroomsize = 50;

// too quick clicktime is difficult to use, too slow and continuous movement has sluggish start
V.clickmaxtime = 500;  // max msecs for button hold down to count as click

V.forceheight = 1.65;
V.keepinroom = true;
V.useorientation = true;
V.usepan = true;
V.alwaysRot = true;
V.tempmatrix = new THREE.Matrix4();
V.tempmycam3 = new THREE.Matrix3();  // 3d version of mycam
V.userooms = false;
V.newroom = 0;
V.roomx = 0;
V.roomz = 0;
//// V.gpp1base = new THREE.Vector3();
V.forwardspeed = 0.0001;
V.torchlift = 6*renderVR.scale / 400;   // lift in m of torch above head. (units?)
V.framesinroom = 0;
V.oldtouched = {};
V.oldpressed = {};
V.gp0pos = new THREE.Vector3();
V.gp1pos = new THREE.Vector3();
// for rotaion, but not used yet
V.lastRealInteract = 0;  // last time we interacted directly with object
V.waitForRotAfterInteract = 10000;  // 10 secs after interact before rot
V.rampUpRot = 5000;  // 5 secs after istart rot to get full speed

V.rightb = -1;
V.leftb = -1;
setroomsize(2.5);
V.homeprob = 1;  // probablility a click will do a HOME, dynamically changed
V.framepick = 1;  // if picking, only every framepick'th frame, not so important when direct gpu preselection
V.headlight = true;  // use headlight
V.torchlight = true; // use torchlight
V.alwaysShowRender = false;  // set to true to force displayof menu etc despite depth

function setroomsize(rs) {
    if (V.nosetroomsize) return;
    if (rs < V.minroomsize) rs = V.minroomsize;
    if (rs > V.maxroomsize) rs = V.maxroomsize;
    var rat = V.roomsize ? rs / V.roomsize : 1;
    V.roomsize  = rs;
    //var objsize = rs * 0.6;
    renderVR.scale = V.baseroomsize/rs;  // 'room size', V.baseroomsize / renderVR.scale
    //currentGenes._uScale = objsize/ (basescale * 2) * renderVR.scale;  // 'object size', basescale * 2 *  currentGenes._uScale / renderVR.scale)
    //currentGenes._uScale *= rat;

    //if (currentGenes._lroomsize)
    //     addtarget( {_scale: currentGenes._lroomsize/4 + 0.25 }) ;
    // addtarget resets too much, but will be useful when we have different timescales for different genes
    var k = 0.95;
    var targ = currentGenes._lroomsize/4 + 0.25;
    currentGenes._scale = k * currentGenes._scale + (1-k) * targ;

    targ = -currentGenes._roomsize * 10;
    currentGenes._posy = k * currentGenes._posy + (1-k) * targ;

    /*** TODO TODO for Dusseldorf
    if (genedefs.wall_bumpscale) {
        genedefs.wall_bumpscale.min = rs * 4;
        genedefs.wall_bumpscale.max = rs * 40;
        setvalr('wall_bumpscale', G.wall_bumpscale);  // make sure it is in bounds
    }
    ***/

}

// reset lots of the details suitable for VR
function restore_view_etc(backwards?) {
    msgfix('lastreset', framenum);

    setDefaultExperiences(vtarget);
    viveAnim.start = {};
    return;
}

// reload start object and reset almost everything
function vrresetall() {
    msgfix('+click', 'reset to start');
    loadcurrent(loadOao.lastfn);

    // we must not change the rotation otherwise the world is incorrect
    // and the controllers rotate wrong too
    if (renderVR.camera) copyFrom(camera.quaternion, renderVR.camera.quaternion);
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camToGenes(currentGenes)
    //delete renderVR.camera;

    // this can upset gpL and gpR for some reason, so swap test must be first
    // camera.position.z = currentGenes._camz = 400;
    restore_view_etc();
    if (appToUse === 'Horn') gpuScaleNow(currentGenes);
    centrescalenow();
    onframe(centrescalenow, 3);
}



/** extra details for New Scientist/Norwich*/
function newscExtras() {
    msgfix.all = false;
    W.UI_overlay.style.display = 'none';
    setDefaultExperiences();
    setTimeout(setDefaultExperiences, 100);
}

var vrcanv: (()=>void) & {n?} = function() {  // originally specific to Norwich, fit left eye to Eizo, may be overridden eg for csynth
if (!vrcanv.n) vrcanv.n=1; vrcanv.n++;
    if (!renderVR.invr()) return fitCanvasToWindow();
    if (!renderVR.addSlot0) {  // normal case to fit screen
        if (!renderVR.pairOnMonitor) return vrcanvCentreOnLeft();
        //canvas.style.left = '-200px';
        //canvas.style.width = '3200px';  // half visible at 1200 wide
        //canvas.style.height = (1600 * 1200 / 1080) + 'px';
        var cut = 1;
        var ww = window.innerWidth, wh = window.innerHeight;
        var ar1 = ww/wh;                  // aspect of screen
        var nw = (ar1 > 1) ? 2 : 1;        // number of windows

        var cx = 1 - Math.sqrt(2/Math.max(2, currentGenes.cutx));  // cutting waste
        var cy = 1 - Math.sqrt(2/Math.max(2, currentGenes.cuty));  // cutting waste

        var rw = canvas.width, rh = canvas.height;    // real full size
        var uw = ((ar1 > 1) ? rw : rw/2) - rw*cx;    // width from full render to use
        var uh = rh - 2*rh*cy;                        // height from full render to use
        var ar2 = rw / rh;    // aspect of full render, canvas style must match this ar
        var ar3 = uw / uh;          // aspect of window to display

        if (ar1 > ar3) { var ch = wh * rh / uh * cut; var cw = ch * ar2}
        else  { cw = ww * rw / uw * cut; ch = cw / ar2}

        canvas.style.width = Math.ceil(cw) + 'px';
        canvas.style.height = Math.ceil(ch) + 'px'; // ceil: gets rid of occasional irritating clicker at bottom
        canvas.style.left = (ww/2 - cw/2 * nw/2) + 'px';
        canvas.style.top = (wh/2 - ch/2) + 'px';
        log('pairOnMonitor vrcanvleft');


    } else {                // special case
        var slot = renderVR.addSlot0;
        vrvideo(false); // todo, find out why this is necessary
        setTimeout(function vr() { vrvideo(slot); }, 100);
    }
}

/** set the canvas centred on the left eye, and scaled by scale
 * with a typical screen of 1920x1280, a scale of 2.44, and typical G.cutx/y values
 * this extracts a region just inside the cut
 * ---
 * 2.44 was chosen when we were using a window size of 1080x1200 per eye
 * now using 2.74, but compensating with heights; gives around 1.25 right now
 *
 */
function vrcanvCentreOnLeft(scale = 2.74 * window.innerHeight/height) {
    let cx = canvas.width/4;  // left eye

    // todo remove/tidy Nov 2020
    //if (renderer. vr.is xr) {  // for XR we are only sending  the left eye to canvas
        canvas.width = width/2;
        canvas.height = height;
        cx = canvas.width/2;        // onlyleft eye copied to canvas in XR
    //}

    let cy = canvas.height/2;
    let cw = canvas.width * scale;  // canvas display h/w
    let ch = canvas.height * scale;

    let sw = window.innerWidth; // * window.devicePixelRatio;  // actual window size
    let sh = window.innerHeight; //  * window.devicePixelRatio;
    let cl = sw/2 - cx*scale;
    let ct = sh/2 - cy*scale;
    canvas.style.left = cl + 'px';
    canvas.style.top = ct + 'px';
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    log('vrcanvCentreOnLeft vrcanvleft','canvstyle l/t/w/h', cl,ct,cw,ch, 'sw/sh', sw,sh, 'cx,cy',cx,cy,
        'canvsize', canvas.width, canvas.height, 'sc', scale);
}

/** York/newsc performance tweak */
function newscTweak() {
    nomess();
    springs.stop();
    renderObjHorn.centreOnDisplay = false;
    setInput(W.resbaseui, 8);
    setInput(W.renderRatioUi, 1);
    shadows(6); // as shadow0 (flag 1) is irrelevant for now
}

function newgroup(name) {
    var g = new THREE.Group();
    g.name = name || 'unnamed';
    return g;
}

V.depthTest = true;  // use depth test while rendering
/** set up the pointer rendering for this frame.
 * this will only change quite rarely (room size or visibility change)
 * but very cheap so do it every frame for now.
 * (update: now changes relatively frequently depending on guiIntersections)
 */
V.leftRayColor = col3(0,1,0);
V.rightRayColor = col3(1,0,0);
V.rayOpacity = 1;
V.setupPointerForFrame = function vsetupPointerForFrame(gp, bypass) {
    if (!gp || !gp.ok) return;

    gp.meshray.visible = !bypass;
    if (gp.bigcontroller) gp.bigcontroller.visible = V.showbigcontrollers;

    // make sure little pointers sensible size
    var r = 2 / V.roomsize * renderVR.scale;
    // let m = gp.meshray.matrix.elements;
    let raylength = V.raylength;
    const intersections = gp.threeObject.userData.guiIntersections;
    if (intersections && intersections.length > 0) {
        raylength = intersections[0].distance;
    }
    const p = gp.meshray.geometry.getAttribute('position');
    p.array[2] = -raylength;
    p.needsUpdate = true;
    // gp.meshray.geometry.vertices[1].set(0, 0, -raylength);
    gp.meshray.geometry.computeBoundingSphere();
    gp.meshray.geometry.computeBoundingBox();
    // gp.meshray.geometry.verticesNeedUpdate = true;
    if (V.laserRotateModifier) gp.meshray.quaternion.copy(V.laserRotateModifier);
    else gp.meshray.quaternion.set(0, 0, 0, 1);
    gp.meshray.updateMatrix();

    gp.meshbox.matrix.makeScale(r, r, r);
    //m = gp.meshbox.matrix.elements;
    //m[0] = m[5] = m[10] = r;

    gp.drawmat.color.copy(gp === V.gpR ? V.rightRayColor : V.leftRayColor); // reset colours in case controllers got switched
    gp.drawmat.opacity = V.rayOpacity; gp.drawmat.transparent = V.rayOpacity !== 1;

    // this part makes sure the big controllers get rendered at the right size/position/orientation
    // var rr = 90 / V.roomsize * 7;
    var rr = renderVR.scale * renderVR.moveScale;  // same scaling as used in renderVR
    var s = gp.bigcontroller;
    if (s) {
        s.matrix.set(rr,0,0,0,  0,rr,0,0,  0,0,rr,0,  0,0,0,1);
        s.matrixAutoUpdate = false; // no need to do every frame
    }
}

function initControllerRenderingScene(gp){
    var loader = new THREEA.OBJLoader();
    //QUERY...
    loader.setPath( 'JSdeps/models/obj/vive-controller/' );
    log('request controller load', gp.hand);
    const st = Date.now();
    loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
        const et = Date.now();
        log('request controller load complete', gp.hand, 'time', et-st);

        var tloader = new THREE.TextureLoader();
        tloader.setPath( 'JSdeps/models/obj/vive-controller/' );

        var controller = object.children[ 0 ];
        controller.material.map = tloader.load( 'onepointfive_texture.png' );
        controller.material.specularMap = tloader.load( 'onepointfive_spec.png' );
        controller.material.depthTest = V.depthTest;

        gp.bigcontroller = controller; // object.clone();
        gp.threeObject.add(gp.bigcontroller);

    } );

}


V.usePrecamTexture = false;
V.render = function vrender(rt) {
    //// make sure scale factor change recentres, probably better to do elsewhere, csynth specific on frame ...???
	// This was very bad with mouse wheel to change dynamically. Why was it ever needed?
    //if (G.scaleFactor !== V.render.lastScaleFactor) {
    //    centrescalenow();
    //    V.render.lastScaleFactor = G.scaleFactor;
    //}

    // if required, capture the data for feedback before details such as purple man spots are rendered
    if (V.usePrecamTexture && cMap.wallType.includes('rt')) {
        if (!V.precamRT || V.precamRT.width !== rt.width || V.precamRT.height !== rt.height)
            V.precamRT = rt.clone();
        copyTextureToRenderTarget(rt, V.precamRT);
    }


    renderer.setRenderTarget(rt);
    if (V.alwaysShowRender)
        renderer.clearDepth();  // clearDepth NOT directly associated with depthTest, but can permit menu to be seen in busy scene, eg texture

    VH.render(rt);


    gl.depthFunc(gl.LEQUAL);

    if (VH.matrix) {
        VH.matrix.newRender(rt);
    }

    if (!V.renderDepthFunc) V.renderDepthFunc = gl.LEQUAL;
    gl.depthFunc(V.renderDepthFunc);

    V.setupPointerForFrame(V.gpR, V.BypassRightLaser);  // ensure pointers will be displayed correctly
    V.setupPointerForFrame(V.gpL, V.BypassLeftLaser);

    // shim to allow all te rawscene components to use modelMatrix etc in standard ways
    V.rawscene.matrix.fromArray(W.uniforms.rot4.value.elements).transpose();
    V.rawscene.matrixAutoUpdate = false;

    opmode = 'camscene_rawscene';
    // below so it shows clearly as rendercamscene on performance profiles
    (function rendercamscene() {
        const s = renderer.sortObjects;
        renderer.sortObjects = true;

        // force menu to be visible if pointed at
        // this could be optimized if necessary, but probably very minor cost
        // does not work well right now som commented out: fixes could include:
        // some things like hover text come out wrong ... set renderOrder appropriately in dat.guiVR
        // ray does not behave properly when on menu, some of it over the menu is lost ... ???
        // if (V.gpR) {
        //     let test = !V.gpR.menuMode;
        //     let nnn;
        //     const makevis = x => {
        //         x.renderOrder = nnn++;
        //         if (x.material) (x.material.depthTest = x.material.depthWrite = test)
        //     }
        //     nnn=0; V.modesgui.traverse(makevis);
        //     if (V.gui.visible) V.gui.traverse(makevis);

        //     const zzz=V.gpR.meshray;
        //     zzz.renderOrder = nnn++;
        //     zzz.material.color.r = 1;
        //     zzz.material.color.b = +!test;
        //     zzz.material.depthTest = zzz.material.depthWrite = test;
        //     zzz.material.transparent = true; zzz.material.opacity = 1;

        //     // V.gpR.laserx.renderOrder = 99999;
        //     // makevis(V.gpR.laserx);
        // }
        if (V.gpR && V.gui) (V.gpR.meshray.material as any).color.b = +V.gpR.menuMode;  // change color when pointing at menu
        if (G.USELOGDEPTH ^ +renderer.capabilities.logarithmicDepthBuffer) {
            let n = 0;V.camscene.traverse(l => {if (l.geometry) n++});
            if (n) {
                G.USELOGDEPTH = +renderer.capabilities.logarithmicDepthBuffer;
                serious('incompatible logdepth for renderer and Organic, Organic set to', G.USELOGDEPTH);
            }
        }

        if (uniforms._lastSetFrame as any !== framenum)
            setObjUniforms(currentGenes, uniforms);
        rrender('camscene_rawscene', V.camscene, camera, rt);
        renderer.sortObjects = s;
    })();

    // V.renderNocam(rt); // ? move to postrender
}

V.renderNocam = function(rt = null) {
    const asp = width/height;
    if (asp !== V.nocamcamera.aspect) {

        V.nocamcamera.aspect = asp;
        V.nocamcamera.left = -asp;
        V.nocamcamera.right = asp;
        V.nocamcamera.updateProjectionMatrix();
        VH.positionGUI();
        if (VH.positiongui2) VH.positiongui2();
    }
    const st = performance.now();
    (function rendernocam() {  // so it shows up in profiler
        const s = renderer.sortObjects;
        renderer.sortObjects = true;
        rendererSetViewportCanv(0,0,width,height);
        if (V.nocamscene?.visible) rrender('nocam', V.nocamscene, V.nocamcamera, rt);
        renderer.sortObjects = s;
    })();
    const et = performance.now();
    V.mentime = V.mendamp * V.mentime + (1-V.mendamp) * (et-st);
}

V.mentime = 1;  V.mendamp = 0.99;  // to help measure menu time

/** keep audio animating always at own speed */
V.audioMutateSpeed = 1;
V.vraudioframe = function vraudioframe() {
    if (oxcsynth || noaudio) return;
    if (!setsynths.done) return;
    if (setsynths.done && !currentHset.audiogenes) {
        currentHset.audiogenes = {};
        for (let gn in usedgenes()) if (genedefs[gn]?.tag.indexOf('audio') !== -1 && genedefs[gn]?.free)
            currentHset.audiogenes[gn] = true;
    }
    animStep(currentGenes, currentHset.audiogenes, V.audioMutateSpeed);
}

/** keep wall animating always at own speed; TODO separate from from VR code */
V.wallMutateSpeed = 1;
V.wallframe = function vwallframe() {
    if (!currentHset) return;  // no hset so wall, need to separate wall from horn better, eg fano
    if (inputs.backgroundSelect === 'color') return;
    if (!currentHset.wallgenes._set) {
        currentHset.wallgenes._set = true; // .wallgenes  = {};
        for (let gn in genedefs) if (genedefs[gn].tag.indexOf('wallcol') !== -1 && genedefs[gn].free)
            currentHset.wallgenes[gn] = true;
    }
    animStep(currentGenes, currentHset.wallgenes, V.wallMutateSpeed);
}

// pending ... load new object as target
V.nextobj = 0;
V.smooth = 0.9;
V.newobj = function Vnewobj() {
    if (!pendingObjects || pendingObjects.length === 0) return;
    V.nextobj++;
    if (V.nextobj >= pendingObjects.length) V.nextobj = 0;
    smooth = V.smooth;  // slow move to target
    settarget(pendingObjects[V.nextobj++]);
    for (let gn in target) if (gn[0] === '_') delete target[gn]
    delete target.light0s; delete target.light1s; delete target.light2s; delete target.ambient;
    delete target._uScale;
    // restore_view_etc();
}


// scale by factor k about centre
V.objscale = function Vobjscale(k) {
    var o = currentGenes._uScale;
    if (isNaN(o)) o = 1;        // can happend for eg fano, of if soemthing odd goes wrong
    applyMatop(undefined,undefined, k, zoom, currentGenes);  // operates on genes._uScale ?
    var n = currentGenes._uScale;  // we've established what the new value should be
    currentGenes._uScale = o;  // but need to set it relative to old so V.setobjscale works
    V.setobjscale(n);
}

// set new scale value to scale about object centre
V.setobjscale = function Vsetobjscale(n) {
    var o = currentGenes._uScale;
    currentGenes._uScale = n;
    if (currentGenes._uScale < 0.05) currentGenes._uScale = 0.05;
    if (currentGenes._uScale > 2.5) currentGenes._uScale = 2.5;
    if (inputs.using4d) return;  // do not try centre in 4d

    var rat = o / currentGenes._uScale;
    msgfix('rat', o, 'new', n);
    //rat = 1;
    currentGenes._rot4_ele[3] *= rat;
    currentGenes._rot4_ele[7] *= rat;
    currentGenes._rot4_ele[11] *= rat;
}

V.recentre = function vrecentre() {
    // todo remove/tidy Nov 2020
    // if (renderer. vr.get Device().resetPose) renderer. vr.get Device().resetPose();
    // renderVR. controls.update();
    // renderVR.camera.updateMatrix();

    camToGenes(currentGenes);
    currentGenes._camx = 0;
    currentGenes._camy = 0;
    currentGenes._camz = 0; // 400 * (backwards ? -1 : 1);
    currentGenes._camqx = currentGenes._camqy = currentGenes._camqz = 0;
    currentGenes._camqw = 1;
    genesToCam();
    camera.updateMatrix();
    camera.updateMatrixWorld();

    delete renderVR.camera;  // will all get recreated with consistent values
    // renderVR.inv = new THREE.Matrix4();
    msgfix('recentre at frame', framenum);

}

/** use a new target to move towards, chosen from HOME or an experience */
function newtarget(button) {
    if (V.skipactions) return;
    return randexperience(button);
}

/** add features from ntarget to vtarget;
 * apply immediately if t === 0
 * convert [] version to {} version if needed
 * */
function addtarget(ntarget) {
    // defined so 'virtual' genes _scale etc can be used in target
    if (!ntarget) return;
    addvirtualgenes();

    if (ntarget.t === 0) {
        vtargetNow(ntarget)
    } else {
        for (let tn in ntarget) {
            let def = ntarget[tn];
            if (Array.isArray(def))
                def = {object: def[0], property: def[1], value: def[2]};
            vtarget[tn] = def;
        }
        viveAnim.newtarget = true;
    }
}

function addvirtualgenes() {
    if (!slots) return;
    for (const s of slots) {
        if (!s) continue;
        const genes = s.dispobj.genes;
        if (!genes) continue;
        if (!genes._rot4_ele) genes._rot4_ele = new THREE.Matrix4().elements;
        if (!('_scale' in genes) || !Object.getOwnPropertyDescriptor(genes, '_scale').get) {
            Object.defineProperty(genes, '_scale', { get : function() { return genes._uScale; }, set : function(v) { V.setobjscale(v); } })
            Object.defineProperty(genes, '_roomsize', { get : function() { return V.roomsize; }, set : function(v) { setroomsize(v); } })
            Object.defineProperty(genes, '_lroomsize', { get : function() { return Math.log10(genes._roomsize); }, set : function(v) {genes._roomsize = Math.pow(10, v); } })
            Object.defineProperty(genes, '_posx', { get : function() { return inputs.using4d ? 0 : genes._rot4_ele[3] * (genes._uScale ?? 1); }, set : function(v) {if (!inputs.using4d) genes._rot4_ele[3] = v / (genes._uScale ?? 1); } })
            Object.defineProperty(genes, '_posy', { get : function() { return inputs.using4d ? 0 : genes._rot4_ele[7] * (genes._uScale ?? 1); }, set : function(v) {if (!inputs.using4d) genes._rot4_ele[7] = v / (genes._uScale ?? 1); } })
            Object.defineProperty(genes, '_posz', { get : function() { return inputs.using4d ? 0 : genes._rot4_ele[11] * (genes._uScale ?? 1); }, set : function(v) {if (!inputs.using4d) genes._rot4_ele[11] = v / (genes._uScale ?? 1); } })
        }
    }
}

var vtargetNow = function(targ: Genes = vtarget) {
    for (let gn in targ) {
        const v = targ[gn];
        if (typeof v === 'number')
            currentGenes[gn] = v;
        else
            v.object[v.property] = v.value;
        delete targ[v]
    }
}

/** move towards target, cubic */
var  viveAnim: ((button)=>void) & {start?, cdt?, newtarget?, basetime?, time?, resttime?,restprop?
    } = function(button) {
    if (!button) return;
    if (!V.gps) return;

    if (viveAnim.newtarget) {
        viveAnim.newtarget = false;
        addvirtualgenes();
        for (let gn in vtarget) {
            const v = vtarget[gn];
            if (typeof v === 'number')
                viveAnim.start[gn] = currentGenes[gn];
            else if (v.object)
                viveAnim.start[gn] = v.object[v.property];
            else
                delete vtarget[gn];

        }
        viveAnim.cdt = 0;  // cumulative delta time
    }
    var pressval = button.value;  // for continuous press
    if (!button.pressed && button.presslength < V.clickmaxtime) // for after quick click
        pressval = 1;
    if (V.gpx.lastNewpressButton !== button)  // after some other button clicked
        pressval = 1;
    if (!pressval && V.gpx.lastNewpressButton === V.gpR.trigger)
        vtarget = {};       // right button released in middle of slow mutate, do not try to keep that mutation any more, 30/8/17, revert to superpull etc
    viveAnim.cdt += framedelta * pressval / viveAnim.time;
    var dt = viveAnim.cdt;
//msgfix('effect', V.effect, 'cdt', dt);
    var sdt = dt > 1 ? 1 : dt;    // dt to use for splining
    var f = (3 - 2 * sdt) * sdt * sdt;
    for (let gn in vtarget) {
        const v = vtarget[gn];
        if (typeof v === 'number') {
            setval(gn, viveAnim.start[gn] * (1-f) + v * f);
        } else if (v.object) {
            v.object[v.property] = viveAnim.start[gn] * (1-f) + v.value * f;
        } else {
            delete vtarget[gn];
        }

    }
    if (dt >= 1) {
        vtarget = {};
        // msgfix('click');  // often clears too quickly
    }
    genesToCam();

    // continuous period for trigger
    if (button !== V.restbutton && button !== V.pretendbutton && V.gpR && button !== V.gpR.trigger) return;
    if (V.gpx.lastNewpressButton !== button) return;   // after some other button clicked

    // compute how much resting time before end ... for historic reasons realtive to viveAnim.time
    // TODO some time? make more sensible
    var restend = 1 + viveAnim.restprop + viveAnim.resttime/viveAnim.time;
    if (V.resting) {
        restend += vrresting.extrawait/viveAnim.time;
        let eclickt = viveAnim.time + viveAnim.resttime + vrresting.extrawait/2;
        if (dt > eclickt / viveAnim.time)
            msgfix('click');
    }

    // with button pressed, continue the piste
    if (dt > restend && button.pressed) { newtarget(button); return; }
//    if (1 < dt && dt < restend)
//        rotcentre(0, framedelta/1000 * Math.min(restend - dt, dt - 1), 0);
}

viveAnim.start = {};
viveAnim.basetime = viveAnim.time = 4000;  // time in millesecs to get to target, if not overwritten for specific experience
viveAnim.restprop = 0;  // rest time relative to time
viveAnim.resttime = 2000;  // rest time absolute, ms
viveAnim.cdt = 0;  // cumulative delta time
var vtarget = {};   // dictionary of target values, key is name, target is value (for genes) or {object: o, property: p, value: v}


function setDefaultExperiences(toset?) {
    addvirtualgenes();
    if (!toset) toset = currentGenes;
    for (let k in experiences)
        copyFrom(toset, experiences[k].opts[0]);
    return toset;
}

// new press of a button, stop related genes animating until further notice
function omvrnewpress(button, key, dir, val) {
    if (V.skipactions) return;
    if (key.endsWith('pad')) {
        omvrnewpress(button, key + 'lr', dir, val);
        omvrnewpress(button, key + 'bt', dir, val);
        return;  // handle in click
    }
    var exps = experiences[key];
    if (!exps) { /** log('bad experience key press', key); **/ return; }
    const opts = exps.opts;
    if (!opts || !opts[0]) {
        serious('unexpected details');
        return; //exps[0] access was causing serious bug in Venice / UCL
    }
    let {t, mint, maxt, restt} = opts[0];  // extract override times if any
    if (t) { mint = 0.5 * t; maxt = 2*t; }
    viveAnim.time = maxt ? mint + Math.random() * (maxt - mint) : viveAnim.basetime;
    viveAnim.resttime = restt || 500;

    for (let gn in opts[0]) {
        delete vtarget[gn];
        // log('delete vtarget', gn);
    }
}

V.flyy = false;  // set to try to allow y to change on fly
//######
function omvrpresshold(button, key, dir, val) {
    if (V.skipactions && ["rightpadbt", "leftpadbt", "leftpadlr"].indexOf(key) === -1) return;
    if (key === 'rightpadlr') {
        //msgfix('+click', 'lights ', dir > 0 ? 'up': 'down');
        let kkk1 = 0.04;
        var k = (1 + val * kkk1);
        if ( (k < 1 && currentGenes.light0s < 0.003) || (k > 1 && currentGenes.light0s > 0.4) ) {  // range check
        } else {
            currentGenes.light0s *= k;
            currentGenes.light1s *= k;
            currentGenes.light2s *= k;
            currentGenes.ambient *= k;
        }
    }

    if (key === 'rightpadbt') {
        // also used by csvrpresshold  |||ima
        // move genes to camera so they can use three.js methods for manipulation
        // the top of the pad gives -ve y, so use -val.  (did this change? sjpt 12/June19)
        // on Chrome 67 still gives +ve for top.  On 76 gives -ve.  sjpt 16/09/2019
        // still sometimes using 67 for GDrive,
        V.forwardspeed = -val * V.staticSpeedMax * renderVR.scale;
        if (navigator.appVersion.includes('Chrome/6')) V.forwardspeed *= -1;
        if (V.forwardspeed) {
            var mm = camera.matrix.elements;
            var m = V.forwardspeed;
            var mmm = V.moveByController && V.gpR ? V.gpR.raymatrix.elements : mm;  // = V.gp0mat to follow controller, = mm for following headset
            camera.position.x -= m * mmm[8];
            if (V.flyy) camera.position.y -= m * mmm[9];
            camera.position.z -= m * mmm[10];
        }
        camera.updateMatrix();
        camera.updateMatrixWorld();
        camToGenes(currentGenes);   // and register the manipulated camera values back in the genes

    }

    let kkk = 0.02;
    if (key === 'leftpadlr') {
        V.objscale(kkk * val);
    }

    if (key === 'leftpadbt') {
        setroomsize(V.roomsize * (1+kkk*val));  // todo check need for 'if' and relation to objscale
    }

    if (key === 'rightsidebutton') {
        let krs = 0.97;
        currentGenes._posx *= krs;
        currentGenes._posy *= krs;
        currentGenes._posz = krs * currentGenes._posz + (1-krs) * -_boxsize;
    }

    if (key === 'lefttrigger') {
        animStep(currentGenes, undefined, V.triggerMutateSpeed);  //<<<<< trigger amount ?
    }
}
V.triggerMutateSpeed = 0.7;

/** omvrclick applies an experience based on key */
function omvrclick(button, key, dir, val, src) {
    if (key.indexOf('abovepad') !== -1) {      // <<< NOTE There is no abovepad for XR
        VH.setguivisible('toggle');
        VH.positionGUI(src ? src.raymatrix : undefined);
    }
    return doexperience(key, dir);
}

interface Mywin {vrclick; vrnewpress; vrpresshold}
function usevr(prefix) {
    // PJT: antipattern?  I'd somewhat prefer for example having an event emitter to which to attach things...
    // which might be assigned in the context of tranrule code.
    W.vrclick = W[prefix + 'vrclick']; // ie csvrclick or omvrclick; I got confused when I searched for those and found nothing.
    W.vrnewpress = W[prefix + 'vrnewpress'];
    W.vrpresshold = W[prefix + 'vrpresshold'];
}
usevr('om');  // default actions is organic mutator actions

// actions for csynth moved to CSynth/defaults.js 16/11/18

// generate random coordinated colours, result in v if given, or just returned
function random_colours(vv?, h?:number, s?:number, v?:number, rad?:number, p1?:number) {
    if (!vv) vv = {};
    if (h === undefined) h = Math.random();
    if (s === undefined) s = Math.random(); s = Math.pow(s, 1/3);
    if (v === undefined) v = Math.random(); // v = Math.pow(v, 1/2);
    var col1 = hsv2rgb(h, s, v);
    //var r1 = col.r, g1 = col.g, b1 = col.b;
    var col2 = hsv2rgb(h+0.5, s, v);
    //var r2 = col.r, g2 = col.g, b2 = col.b;
    msgfix('random_colours', h,s,v, '...', col1, col2);
    if (p1 === undefined) p1 = Math.random();  // proportion of first colour


    if (rad === undefined)  rad = Math.random();
    // r=g=b=0.5; rad=0;
    var reds = FF(genedefs, 'red');
    for (let gnr in reds) {
        if (gnr.endsWith('reflred')) continue;
        var gng = gnr.replace('red', 'green');
        var gnb = gnr.replace('red', 'blue');
        var gdr = genedefs[gnr];
        //if (!gdr.free) continue;
        var gdg = genedefs[gng];
        //if (!gdg.free) continue;
        var gdb = genedefs[gnb];
        //if (!gdb.free) continue;
        if (!gdr || !gdg || !gdb) continue;
        var col = Math.random() < p1 ? col1 : col2;
        var x = clip(col.r + rad * rand(), gdr); vv[gnr] = x;
        x = clip(col.g + rad * rand(), gdg); vv[gng] = x;
        x = clip(col.b + rad * rand(), gdb); vv[gnb] = x;
    }
    addtarget(vv);  // TODO make this less specfic
    return vv;

    function rand() { return Math.random() - 0.5; }

    function clip(vp, gd) {
        if (vp < gd.min) vp = gd.min;
        if (+1) return vp; // ??? allow big v
        if (vp > gd.max) vp = gd.max;
        return vp;
    }
}

// perform small rotation of object about centre using x, y, z values
// order not important if x,y,z small
function rotcentre(x,y,z) {
    if (inputs.using4d) return rot4dz(x,y,z);  // this is not valid for 4d TODO
    V.eul.set (x, y, z);
    var m = V.tempmatrix;
    m.makeRotationFromEuler(V.eul);     // order not important as angles small
    var m2e = V.tempm2.elements;
    for (let i=0; i<12; i++) m2e[i] = (i%4 === 3) ? 0 : currentGenes._rot4_ele[i];  // get old matrix rotation
    m2e[12] = m2e[13] =  m2e[14] = 0;
    m2e[15] = 1;
    V.tempm2.multiply(m);
    for (let i=0; i<12; i++) if (i%4 !== 3) currentGenes._rot4_ele[i] = m2e[i];  // and set matrix only of rot4ele
}

// small rotation in 4d, using z
function rot4dz(x,y,z) {
    applyMatop(1, 2, -x, rot, currentGenes);
    applyMatop(2, 0, -y, rot, currentGenes);
    applyMatop(0, 1, -z, rot, currentGenes);
}

// small rotation in 4d, using w
function rot4dw(x,y,z) {
    applyMatop(0, 3, x, rot, currentGenes);
    applyMatop(1, 3, y, rot, currentGenes);
    applyMatop(2, 3, z, rot, currentGenes);
}




// sometimes (especially at new machine boot first run)
// we get white rendering on headset even though all software appears to be correct.
// not yet found an automated detection for this
// but code below appears to fix it
function reforcevr() {
    renderVR.xrfs(false);
    onframe(forcevr);
}

V.deltaStack = 1000;
V.deltaBend = 100;
V.deltaTwist = 100;
V.deltaShine = 100;
V.deltaTexscale = 400;
V.deltaGloss = 1;
V.controllerLen = 0.15;  // offset for hand pivot from controller reference point

// establish the diffs and sums of the controllers
// This performs the tranlation raw positions -> derived diffs,
// which are used (4/10/2017)for mapping to genes in controllersForShape
// We break down the positions to try to compensate for direction the user is pointing (NOT looking)
// xdiff depends on opening/closing the hands
// ydiff depends on pumping hands up and down
// zdiff depends on pumping the hands in/out towards the body
//
// dxdiff, dydiff, dzdiff are frame differences (not meaningful when controller was not around in previous frame)
//###
V.controllerDiffs = function VcontrollerDiffs() {  // prepare diff values for superpull effect
    const gps = V.gps;
    let rpos, lpos, cpos;
    try {
        const sc = 1/renderVR.scale;

        rpos = V.gpR.pose.position;
        lpos = V.gpL.pose.position;

        // compensate the controller positions to guess hand pivot position
        // this prevents rotation of the controllers polluting the (relative) position information
        let m = V.gpR.raymatrix.elements;
        const sc2 = V.controllerLen;
        rpos[0] += m[8] * sc2; rpos[1] += m[9] * sc2; rpos[2] += m[10] * sc2;

        m = V.gpL.raymatrix.elements;
        lpos[0] += m[8] * sc2; lpos[1] += m[8] * sc2; lpos[2] += m[10] * sc2;

        cpos = camera.position;
        const myc = renderVR.mycam.elements;
        cpos = [(cpos.x - myc[12]) * sc, (cpos.y - myc[13]) * sc, (cpos.z - myc[14]) * sc];
    } catch(e) { return; }

    const rl = gpx.lrdist = xzdist(rpos, lpos);
    const cl = gpx.camldist = xzdist(cpos, lpos);
    const cr = gpx.camrdist = xzdist(cpos, rpos);

    // xdiff is a measure of 'openness' of the two hands
    const usedist = Math.min(cl, cr);  // used to normalize the two arm distances to remove twist component, one arm in other arm out
    const scr = usedist / cr;
    const rreach = [(rpos[0]-cpos[0]) * scr, 0, (rpos[2]-cpos[2]) * scr];  // normalized right arm reach
    const scl = usedist / cl;
    const lreach = [(lpos[0]-cpos[0]) * scl, 0, (lpos[2]-cpos[2]) * scl];  // normalized left arm reach

    // work out diff values
    const xdiff = gpx.xdiff = xzdist(rreach, lreach);
    // xdiff = rl;  // unnormalized version, impaced by
    const dxdiff = gpx.dxdiff = xdiff - gpx.lastxdiff;
    gpx.lastxdiff = gpx.xdiff;

    // up/down difference
    const ydiff = gpx.ydiff = rpos[1]-lpos[1];
    const dydiff = gpx.dydiff =  ydiff - gpx.lastydiff;
    gpx.lastydiff = ydiff;

    // twist component, one arm in, other arm out
    const zdiff = gpx.zdiff = cr - cl;
    const dzdiff = gpx.dzdiff = zdiff - gpx.lastzdiff;
    gpx.lastzdiff = zdiff;
    //msgfix('diffs', xdiff, ydiff, zdiff, '...', cl, cr, rl, '>delta diffs', dxdiff, dydiff, dzdiff);

    // work out sum values
    const dir = v => Math.atan2(v[0], v[2]);  // direction of vector, (-pi, pi]
    const xsum = gpx.xsum = dir(rreach) + dir(lreach);  // probably not much use as raw value, only dxsum
    let dxsum = gpx.dxsum = xsum - gpx.lastxsum;
    if (dxsum > Math.PI) dxsum -= Math.PI;              // in case we went right round the back
    if (dxsum < -Math.PI) dxsum += Math.PI;
    gpx.lastxsum = gpx.xsum;

    // up/down together sum
    const ysum = gpx.ysum = rpos[1]+lpos[1];
    const dysum = gpx.dysum =  ysum - gpx.lastysum;
    gpx.lastysum = ysum;

    // in/out arms together
    const zsum = gpx.zsum = cr + cl;
    const dzsum = gpx.dzsum = zsum - gpx.lastzsum;
    gpx.lastzsum = zsum;
    //msgfix('sums', xsum, ysum, zsum, '...', cl, cr, rl, '>delta sums', dxsum, dysum, dzsum);

    // distance between two array points in xz plane
    function xzdist(a, b) {
        return Math.sqrt( sqr(a[0]-b[0]) + sqr(a[2]-b[2]));
    }

}
function sqr(x) { return x*x; }

//###
/** use derived controller values (from controllerDiffs) to control genes */
V.controllersForShape = function VcontrollersForShape (trigger) {  // superpull effect
    if (trigger.newpress)
        return;  // we have established new starting point, but deltas are rubbish till next sample
    var gps = V.gps;
    if (!gpx.gpBothok) return;

    for (let gns in genedefs) {
        const gn = gns as Xstring
        const tag = genedefs[gn].tag;
        if (tag.indexOf('geom') !== -1) {   // we only want to see geometry genes
            // separate out tails on the head, tails on the tail, and the rest.  We may not use the tail separation
            var htail = gn.startsWith('subtail_') || gn.startsWith('headtwigtail_');  // is a tail on the head
            var ttail = gn.startsWith('cagetail_') || gn.startsWith('twigtail_');  // is a tail on the tail
            var rest = !htail && !ttail;    // one of the rest
            // rest = true;  // to avoid use of the rotation for the tails
            if (rest) {
                // these changes apply to the core horns but not to the tails
                if (gpx.dxdiff !== 0 && gn.endsWith('stack'))
                    setvalr(gn, currentGenes[gn] + V.deltaStack * gpx.dxdiff);
                if (gpx.dydiff !== 0 && gn.endsWith('bend'))
                    setvalr(gn, currentGenes[gn] + V.deltaBend * gpx.dydiff);
                if (gpx.dzdiff !== 0 && gn.endsWith('twist'))
                    setvalr(gn, currentGenes[gn] + V.deltaTwist * gpx.dzdiff);
            } else {
                // the angular changes to the controllers apply to the tips headtwigtail and twigtail
                // TODO, recompose the axes (at least xz) to allow for the arm direction
                ttail = false; // experiment, all tails controlled by right so left can do rotation
                var ang = ttail ? V.gpL.pose.angularVelocity : V.gpR.pose.angularVelocity;  // right for the head, left for the tail
                var kkk = 0.01;
                if (gn.endsWith('stack'))
                    setvalr(gn, currentGenes[gn] + V.deltaStack * kkk * ang[0]);
                if (gn.endsWith('bend'))
                    setvalr(gn, currentGenes[gn] + V.deltaBend * kkk * ang[1]);
                if (gn.endsWith('twist'))
                    setvalr(gn, currentGenes[gn] + V.deltaTwist * kkk * ang[2]);
            }
        } else if (tag.indexOf('NOTYETwallcol') !== -1) {
            if (gpx.dxsum !== 0 && gn.startsWith('wall_shin'))
                setvalr(gn, currentGenes[gn] + V.deltaShine * gpx.dxsum);
            if (gpx.dysum !== 0 && (gn.startsWith('wall_texscale') || gn.startsWith('wall_bumpscale')))
                setvalr(gn, currentGenes[gn] + V.deltaTexscale * gpx.dysum);
            if (gpx.dzsum !== 0 && gn.startsWith('wall_gloss'))
                setvalr(gn, currentGenes[gn] + V.deltaGloss * gpx.dzsum);
        }


    }

}

// patch models designed outside VR for vr
const vivepatch: (()=>void) & {lastfixtime?} = function() {
    if (!renderVR.invr() && !startvr) return;
    oneside();  // call every frame just in case, cheap
    if (vivepatch.lastfixtime > loadOao.lasttime) return;

    setInput(W.GPUSCALE, !inputs.using4d);
    vivepatch.lastfixtime = frametime;

    V.skip = false;
    currentGenes.wallSize = 1;
    restore_view_etc();  // should fix things such as lights

    setInput(W.NOMESS, true);
    // do not allow ANY messages for Linx, 20/8/2017 setInput(W.NOMESS,false);  // clean all but allow limited messages
    msgfix.all = 'click';

    setInput(W.doAutorot, false);

    if (renderVR.invr()) vrcanv();  // vivepatch is being called every frame, the alternatives below were getting silly
    //for (let i = 0; i < 20; i++)
    //    setTimeout(vrcanv, i * 1000);
    //if (hostname === "DESKTOP-M32L6JT") setInterval(vrcanv, 10000);  // Norwich belt and braces

    if (!V.startgenes) V.startgenes = clone(currentGenes);  // capture startgenes after they have settled a little

    // This was needed to make the zoomgui slider more liberal
    // but now not needed as slider avoided when not displayed
    //W.zoomgui.max = "10";  // can get really close in VR
    //W.zoomgui.min = "-10";  // can get really close in VR
    //W.zoomgui.step = "0.0000001";        // no need to change this


}
vivepatch.lastfixtime = 0;

/* set one sided materials with no x
and given value if x set,
or double if x set and invalid */
// should be dead by now, make correct side at definition time
function oneside(x?) {
    if (!currentGenes.name) currentGenes.name = appToUse;
    if (currentGenes.name.startsWith('csynth')) return;  // must not make matrix single in VR
    if (x === undefined) x = THREE.FrontSide;
    else if (x === THREE.FrontSide || x === THREE.DoubleSide || x === THREE.BackSide) {}
    else { log('oneside uses Double as unexpected value given', x); x = THREE.DoubleSide; }

    for (let i in material) {
        if (typeof material[i] === 'object') {
            for (let j in material[i]) {
                var mmm = material[i][j];
                if (mmm && mmm.side < 3)  // eg if it is a proper material
                    mmm.side = x;
            }
        }
    }
}

// test for restore
function restore_start_form() {
    if (!loadOao.lastgenes) return;  // cannot restore in eg Fano with no loadOao
    // restore_view_etc
    var v = {};
    for(var gn in V.startgenes)
        if (genedefs[gn] && genedefs[gn].free)
            v[gn] = loadOao.lastgenes[gn];
    addtarget(v);
//    loadOao.lasttime = frametime;  // so vivepatch will get called, but that was causing problems ....
    return v;
}

//
function randsynth() {
    if (!currentHset) return;  // no horn, no saved audiogenes, eg fano
    var v = {};
    if ( currentHset.audiogenes) randobj(v, false, currentHset.audiogenes);
    addtarget(v);
}



////////////////////////////////////////

const setsynths: (()=>void) & {done?} = function() {
    if (oxcsynth) return;
    if (!SynthBus || !master || !master.parms || master.parms.db === undefined) { setTimeout(setsynths, 200); return; }
    setsynths.done = true;
}
setsynths();


V.showbigcontrollers = false;

// raw scene viewed by camera
V.camscene = new THREE.Scene(); V.camscene.name = 'camscene';
V.rawscene = new THREE.Group(); V.rawscene.name = 'rawscene';
V.camscene.add(V.rawscene);
V.rawscene.autoUpdate = true;  // ???? as this is a Group, not a real Scene, autoUpdate works, but ? matrixWorldAutoUpdate is as good ?
V.setCamLights = function() {
    V.camscene.remove(V.lightGroup);
    V.lightGroup = new THREE.Group(); V.lightGroup.name = 'lightgroup';
    V.camscene.add(V.lightGroup);

    V.lightGroup.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

    const light = new THREE.DirectionalLight( 0x808080 );
    light.position.set( 1, 1, 1 ).normalize();
    V.lightGroup.add( light );

    const lighta = new THREE.AmbientLight( 0xffffff, 0.01 );
    lighta.name = 'ambientlight';
    V.ambientlight = lighta;
    V.lightGroup.add(lighta);
}
V.setCamLights();

// scene viewed without camera
V.nocamscene = new THREE.Scene(); V.nocamscene.name = 'nocamscene';
let aspect = window.innerWidth / window.innerHeight;
V.nocamcamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 1, 100);
//V.nocamcamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
V.nocamcamera.position.z = 2.5
V.nocamcamera.autoUpdate = false; V.nocamcamera.matrixAutoUpdate = false; V.nocamcamera.frustumCulled = false;
updateMat(V.nocamcamera);
Maestro.on('postframe', () => V.renderNocam(null));



/** VR nothing happening, test for change and take action */
vrresting = function() {
    if (vrresting.bypassResting) { V.resting = false; return; }
    let r = [];  // for debug

    /* detect amount of movement of object with pose, using angular/linear velocities */
    function moved(obj, t) {
        if (!obj) {r.push(t + ': no'); return 0;}
        let pose = obj.pose;
        if (!pose) {r.push(t + ': nopose'); return 0;}
        let ang = alen(pose.angularVelocity) * vrresting.angMult;
        let lin = alen(pose.linearVelocity) * vrresting.linMult;
        r.push(t + ': ' + format(ang) + '/' + format(lin));
        return ang + lin;
    }

    // find individual movement rates, and cumulative v
    const a = moved(renderVR.camera, 'head');  // renderVR.camera given pose by edit of three.js
    const b = moved(V.gpR,'gpR');
    const c = moved(V.gpL,'gpL');
    const d = (frametime - V.lastPressedFrame < 1000) ? 100 : 0;  // recent press count as big movement
    const v = Math.max(a, b, c, d);
    const damp = V.resting ? vrresting.dampToWake : vrresting.dampToSleep;
    vrresting.damped = damp * vrresting.damped + (1-damp) * v;  // damp

    // use thresholds to control variable V.resting
    if (renderVR.invr()) {
        if (V.resting && vrresting.damped > vrresting.wakeThresh) V.resting = false;
        else if (!V.resting && vrresting.damped < vrresting.sleepThresh) V.resting = true;
    }
    if (vrresting.bypassResting) V.resting = false;


    if (vrresting.msg) {
        msgfix('>resting', V.resting, format(vrresting.damped), v, a,b,c,d, 'damp=', damp, '<br>',r.join(', '));
    } else {
        msgfix('resting');
    }

    // rotation and mutation while in resting mode or on piste
    let k = framedelta * 2 * Math.PI / 1000;
    if (V.resting) {
        rotcentre(k / vrresting.xrotsecs, k / vrresting.yrotsecs, 0);

        animStep(currentGenes, undefined, vrresting.mutatespeed);
    } else if (V.gpR && V.gpR.trigger && V.gpR.trigger.pressed) {
        rotcentre(k / vrresting.pistexrotsecs, k / vrresting.pisteyrotsecs, 0);

    }
}
// constants for detection of resting or not
vrresting.angMult = 10;  // multiplier of angular velocity
vrresting.linMult = 50;  // multiplier of linear velocity
vrresting.dampToSleep = 0.997;   // damping factor to sleep, fairly slow change
vrresting.dampToWake = 0.99;      // damping factor to wake, faster reaction
vrresting.damped = 0;    // damped result (NOT a control value)
// with the above values if I stand very still I get values around damped = 0.8 for damped
// noise levels with controls and headset sitting on chair are around damped = 0.3
// short burst of hitting chair raises values to around damped = 2
vrresting.wakeThresh = 10;  // threshold for waking <<<<<
vrresting.sleepThresh = 0.5; // threshold for sleeping <<<<<
vrresting.msg = true;  // turn to false to kill message about 'internals' of rest detection code <<<<

// constants for special behaviour when resting
vrresting.xrotsecs = 93;  // number of seconds for complete x rotation when resting
vrresting.yrotsecs = 40;  // number of seconds for complete y rotation when resting
vrresting.pistexrotsecs = 150;  // number of seconds for complete x rotation on piste
vrresting.pisteyrotsecs = 77;  // number of seconds for complete y rotation on piste
vrresting.mutatespeed = 0.5;  // mutation rate when resting
vrresting.extrawait = 5000; // extra wait between effects while resting
vrresting.fov = 50; // field of view while resting
vrresting.lookup = 0.7; // amount to look up at object above.  0 look forward, 1 look directly at centre
// PJT: not sure why this was this wasn't made opt-in for new things that wanted it.
// things that don't can set this to false now...
// sjpt: at least don't go into resting when we are not remotely near VR
vrresting.bypassResting = !_navigatorGetVRDisplays;


// length for array
function alen(a) {
    if (!a) return 0;  // a may be null, eg if headset pose details not complete
    var d = 0;
    for (let i=0; i < a.length; i++) d += a[i]*a[i];
    return Math.sqrt(d);
}

/** check for VR, and if none then avoid some VR code */
var  checkvr: (()=>void)& {listeners?} = function() {
    if (!_navigatorGetVRDisplays) {
        log('checkvr reset at ', framenum);
        V.skip = true;
        vrresting.bypassResting = true;
        setNovrlights();
        // defer till needed V.pickfun = CSynthFast ? pickGPU : pick;  // slight delay from readback does not notice out of VR on PC
        for (let i=0; i < checkvr.listeners.length; i++)
            checkvr.listeners[i]();
    }
}
checkvr.listeners = [];

// experiment towards using real VR scale for camera etc
function tryRealScale() {
    V.forceheight = false;
    V.recentre();
    renderVR.near = camera.near = 0.01;  // note, VERY different from standard value, maybe too small ??
    G._rot4_ele = [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1];
    renderVR.scale = 1;
    basescale = 1;
    centrescalenow();
    G.shrinkradiusA = G.shrinkradiusB = 0;
}


V.still = function() {
    V.saveAnimStep = animStep;
    animStep = nop;
    vrresting.bypassResting = true;
}

var lastGamepads: {position: THREE.Vector3, quaternion: THREE.Quaternion}[] = [] as any;
/*** sort of polyfill to provide gamepads with poses in XR
 *
*/
V.getXrGamepads = function(): OrgGP[] {
    const gps: OrgGP[] = [];
    const session = renderer.xr.getSession();
    if (!session) return gps;       // we are in XR but don't have a session
    for (let i = 0; i < session.inputSources.length; i++) {
        if (!V.buttons) {
            const prof = session.inputSources[0].profiles[0] || ' ';
            V.buttons = prof.startsWith('oculus')
                ? ['trigger', 'sidebutton', '?', 'pad', 'X', 'abovepadbutton'] // XR Oculus, abovepadbutton is Y, ? as no touchpad
                : ['trigger', 'sidebutton', 'pad', 'abovepadbutton']; // XR Vive
            for (let i=0; i < V.buttons.length; i++) V[V.buttons[i]] = i;
        }

        // the gamepad style information such as buttons comes (when available) from the session inputSources
        // NOTE: interface claims it has
        const igp = session.inputSources[i].gamepad;
        if (!igp) {msgfixerror('Webxr gamepads'+i, 'WebXR input source does not have "gamepad" field'); return [];}
        msgfix('Webxr gamepads'+i);       // clean error message if it goes away
        const gp : OrgGP = {} as any;
        for (let k in igp) gp[k] = igp[k]; // nb, copyFrom and Object.assign failed ...!!! sjpt 13 Apr 2021
        // above failed with emulator, 11 Sept 2023, so copy explicitly
        'axes buttons connected id index'.split(' ').forEach(k => gp[k] = igp[k]);

        // https://www.w3.org/TR/webxr-gamepads-module-1/#xr-standard-heading
        if (gp.axes.length === 4) (gp as any).axes = igp.axes.slice(2,4) // Oculus reports axes as [0,0,x,y], thumbstick not gamepad

        // The controller will have been set up in the three.js XR manager onAnimationFrame/inputPose
        // using XRframe.getPose supplied by XR.
        // Rather than trying to get access to the XRframe we take
        // position/orientation (pose) information from the three controller (Group)
        //
        // controller.visible will be set in three.js based on XR frame.getPose( inputSource.targetRaySpace, referenceSpace ) === null
        // not sure if we really use hasPosition/hasOrientation
        //
        const controller = renderer.xr.getController(i);
        const b = -999;
        const pose: OrgGPPose = {
            rayMatrix: controller.matrix,
            poseMatrix: controller.matrix,
            position: controller.position.toArray(),
            hasPosition: controller.visible,
            orientation: controller.quaternion.toArray(),
            hasOrientation: controller.visible,
            visible: controller.visible,
            linearVelocity: [b,b,b],
            angularVelocity: [b,b,b,b],
        };
        // if (!controller.visible) {pose.position.set(b,b,b); pose.orientation.set(b,b,b,b); }  // invalidate unguarded use

        // synthesize velocities; were available in old nagigator.getGamepads(), but not in XR
        const last = lastGamepads[i];
        if (last && framedelta) {       // in rare cirumstances animation loop gets called twice with same time
            pose.linearVelocity = controller.position.clone().sub(last.position).multiplyScalar(1000/framedelta).toArray();
            const av = controller.quaternion.clone().multiply(last.quaternion.invert());
            const ava = av.toArray().slice(0,3).map(v => v * 1000/framedelta * V.rotrate);
            pose.angularVelocity = ava;
            Math.abs(-Infinity) === Infinity
        } else {
            pose.linearVelocity = [0,0,0];
            pose.angularVelocity = [0,0,0,0];
        }
        lastGamepads[i] = {position: controller.position.clone(), quaternion: controller.quaternion.clone()};

        // copyFrom(rr, gp);
        gp.pose = pose;
        gps.push(gp);
    }
    return gps;
}
V.rotrate = 1;

// it would be good to arrange a parent to hold V.gui plus the undocked gui items,
// but that would disturb quite a bit of code, so below is hopefully safer.
// eslint-disable-next-line object-curly-newline
Object.defineProperty(V, 'showgui', {
    set: v => {if (V.gui) V.gui.parent.children.forEach(x => {if (x.guiName) x.visible = v;});  return; },
    get: () => !!(V.gui?.visible)});


/****
 * nocamscene
 *     gui (novr)
 * camscene
 *     lights
 *     gui (vr)
 *
 *
*/
// ????? }  // end namespace