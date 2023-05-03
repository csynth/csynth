'use strict';
var CSynth, kinect, ofirst, SG, VEC3, Maestro, msgfix,  kinectDrawskel;

/** test code for CSynth with kinect  */
CSynth.kframe = function() {
    const b = CSynth.bundle1 = ofirst(kinect.bundle);
    if (!b) return;

    const clench_right = b.handtipright_d.distanceTo(b.thumbright_d);
    const ang_right = VEC3().crossVectors(b.wristright_d.clone().normalize(), b.handright_d.clone().normalize()).length();

    if (ang_right < 0.7)
        SG._posxyz = b.wristright.clone().multiplyScalar(CSynth.kinectMoveFactor)
    msgfix('handright_d', b.handright_d);
    msgfix('handtipleft_d', (b.handtipleft_d).length());
    msgfix('thumbleft_d', (b.thumbleft_d).length());
    msgfix('clench_left', (b.handtipleft_d).distanceTo(b.thumbleft_d));
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
