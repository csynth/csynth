// openvrServer is used to give clients access to controllers
// without the clients needing to have explicit openvr (?openxr) access.
// Used by tadpole monitorTrackers(), eg for Leeds dance setup.
import {log} from './serverUtils';
import * as http from "http";
import { Server as WebSocketServer } from "ws";
import * as openvr from "openvr.js";


export function openVRServer() {
    const port = 57779;

    /** function called when new client connects */
    function onWSConnection(connection) {
        try {
            connection.on("message", function (message) {
                try {
                    const r = doopenvr(); // start server if needed, and get data
                    connection.send(r);
                } catch (e) {
                    log(`openVRServer: error ${e}`);
                }
            });

            connection.on("close", function () {
                doopenvrClose();
            });
        } catch (ee) {
            log("error in openVRServer.onWSConnection", ee);
        }
    }

    function initWebSocketServer() {
        const server = http.createServer();
        const wsrv = new WebSocketServer({ server });
        wsrv.on("connection", onWSConnection);
        wsrv.on("error", error => log("openVRServer error: ", error));
        server.listen(port, () => {
            log("openVRServer listening on port " + port);
        });
    }
    initWebSocketServer();

    let vrhandle: openvr.vr.IVRSystem,
        opening = 0,
        lasttry = 0,
        wait = 500;
    function doopenvr() {
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        const vr = openvr.vr;

        if (!vrhandle) {
            if (opening === 0) {
                console.log("~~~~~~~~~~~~~~~~ opening vr");
            }
            try {
                if (Date.now() < lasttry + wait)
                    return JSON.stringify({ attempts: opening });
                vrhandle = vr.VR_Init(
                    vr.EVRApplicationType.VRApplication_Background
                );
            } catch (e) {
                process.stdout.write(
                    "VR_Init failed attempts " + opening++ + "\r"
                );
                lasttry = Date.now();
                return JSON.stringify({ error: e, attempts: opening });
            }
            console.log(
                "~~~~~~~~~~~~~~~~ vr open",
                vrhandle,
                "after",
                opening,
                "failed attempts"
            );
            opening = 0;
            // ?? vrhandle.PollNextEvent does not appear to be available
            // on vr.EVREventType.VREvent_Quit  ?? how to listen on a vr event ??
            // vrhandle.AcknowledgeQuit_Exiting()
            // vr.VR_Shutdown();
            // vrhandle = undefined
            // NO process.on(vr.EVREventType.VREvent_Quit, () => {vrhandle.AcknowledgeQuit_Exiting(); vr.VR_Shutdown(); vrhandle = undefined});
        }
        const r = [];
        const pose = vrhandle.GetDeviceToAbsoluteTrackingPose(
            vr.ETrackingUniverseOrigin.TrackingUniverseSeated,
            // vr.ETrackingUniverseOrigin.TrackingUniverseStanding,
            0
        ); // get all poses

        let u = 0;
        for (let i = 0; i < pose.length; i++) {
            const pp = pose[i]; //  as any;  // as any needed as openvr.js has wrong type information for pose; openvr.js patched for now
            const ppa = pp as any;
            if (ppa.poseIsValid) {
                r[i] = pp;
                ppa.trackedDeviceClass = vrhandle.GetTrackedDeviceClass(i);
                u++;
                // ppa.
                // const role = hand.GetControllerRoleForTrackedDeviceIndex(i);
                // r.push([i, trackedDeviceClass, pp.velocity, pp.deviceToAbsoluteTracking]);
            }
        }

        // GetControllerStateWithPose is missing, so code below is not fully working,
        // but GetDeviceToAbsoluteTrackingPose() gets all the poses
        // which is all we need for Vive trackers/Leeds/Dance

        // for (let i = 0; i < vr.k_unMaxTrackedDeviceCount; i++) {
        //     if (!hand.IsTrackedDeviceConnected(i))
        //         continue;

        //     // if (hand.GetControllerState((unDevice, &state, sizeof(state)))
        //     const trackedDeviceClass = hand.GetTrackedDeviceClass(i);
        //     if (trackedDeviceClass > 3) continue;
        //     // Invalid = 0, HMD = 1, Controller = 2, GenericTracker = 3, TrackingReference = 4, DisplayRedirect = 5, Max = 6

        //     switch(trackedDeviceClass) {

        //         case vr.ETrackedDeviceClass.TrackedDeviceClass_HMD: {
        //             const pose = hand.GetDeviceToAbsoluteTrackingPose(vr.ETrackingUniverseOrigin.TrackingUniverseStanding, 0);
        //             const p0 = pose[0];
        //             const pp = (p0 as any).deviceToAbsoluteTracking;
        //             r.push([i, trackedDeviceClass, +p0.poseIsValid, pp] .flat(3).join(' '));
        //         } break;

        //         case vr.ETrackedDeviceClass.TrackedDeviceClass_Controller: {
        //             //const spose = hand.GetControllerStateWithPose(vr.TrackingUniverseStanding, unDevice, &controllerState,
        //             //    sizeof(controllerState), &trackedControllerPose);
        //         } break;

        //         case vr.ETrackedDeviceClass.TrackedDeviceClass_GenericTracker: {
        //         } break;

        //     }
        // }

        // return r.join('\n');
        return JSON.stringify(r);
    }

    function doopenvrClose() {
        openvr.vr.VR_Shutdown();
        vrhandle = undefined;
    }
}
