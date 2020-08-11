'use strict';
var CSynth, kinect, ofirst, SG, VEC3, Maestro, msgfix,  kinectDrawskel;

/** test code for CSynth with kinect  */
CSynth.kframe = function() {
    const b = CSynth.bundle1 = ofirst(kinect.bundle);
    if (!b) return;

    const clench_right = b.handtip_right_d.distanceTo(b.thumb_right_d);
    const ang_right = VEC3().crossVectors(b.wrist_right_d.clone().normalize(), b.hand_right_d.clone().normalize()).length();

    if (ang_right < 0.7)
        SG._posxyz = b.wrist_right.clone().multiplyScalar(CSynth.kinectMoveFactor)
    msgfix('hand_right_d', b.hand_right_d);
    msgfix('handtip_left_d', (b.handtip_left_d).length());
    msgfix('thumb_left_d', (b.thumb_left_d).length());
    msgfix('clench_left', (b.handtip_left_d).distanceTo(b.thumb_left_d));
    msgfix('clench_right', clench_right);
    msgfix('ang_right', ang_right);
    msgfix('hand states', b.handLeftState, b.handRightState);
}
CSynth.kinectMoveFactor = 250;

CSynth.startKinect = function() {
    kinect.start();
    Maestro.on('kinectbundle', () => CSynth.kframe());  // indirect for debug changes to kframe
    kinectDrawskel.start();  // maybe not long term ...
}
