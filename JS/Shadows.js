"use strict";

//    Shadow utilities
//    creates render target for shadow depth texture
//  can also draw an object with the depth texture -- debug
var THREE, render_camera, render_depth, WebGLRenderTarget, trysetele, saveInputToLocal, cdispose, dat, V, inputs, renderVR,
copyFrom, isWebGL2, _boxsize;

ShadowP.extraWidth = 1.7; // w.i.p.
function ShadowP (pnum) {
    var s = this;
    var num = pnum;  // shadow number
    // depth render target
    //s.m_depthRenderTarget;

    //s.m_camera;        // orthonormal camera that we will render the depth texture with. Will be placed at position x and pointed to lightDirection

    // debug crap
    //s.m_debugPlane;    // debug depth buffer drawing
    //s.m_depthDrawVert;
    //s.m_depthDrawFrag;

    //s.m_debug_scene;
    //s.m_debug_quad;
    //s.m_debug_camera;
    //s.m_shadowMaterial;
    //s.m_depthOutMaterial;
    s.m_lookat = new THREE.Vector3(0,0,0);
    s.tempv = new THREE.Vector3(0,0,0);

    /** make the shadow camera track the main lights
    currently needs to be done twice ... sjpt 2 April 2015, to chase after Edinburgh
    */
    s.RenderShadow = function(genes, camera, uniforms) {
        if (!uniforms.light0x) return;  // not ready yet

        var lightnum = 'light' + num;
        var lx = genes[lightnum + 'x'];
        var ly = genes[lightnum + 'y'];
        var lz = genes[lightnum + 'z'];
        var ldx = genes[lightnum + 'dirx'];
        var ldy = genes[lightnum + 'diry'];
        var ldz = genes[lightnum + 'dirz'];
        var spread = genes[lightnum + 'Spread'];

        if (!s.m_depthRenderTarget) init(uniforms);
        s.m_camera.up.set(0, 1, 0);

        if (ldx >= 490) {   // 490 = NODIR, use directional lights if >=
            // use light direction, but further away (should use non-perspective ?)
            // use _boxsize to establish how far away, fov etc.
            var ld = Math.sqrt(lx*lx + ly*ly + lz*lz);  // light dist as defined
            var cd = _boxsize * 10;
            var fac = cd/ld;

            s.m_camera.position.x = lx * fac;
            s.m_camera.position.y = ly * fac;
            s.m_camera.position.z = lz * fac;
            s.m_camera.lookAt(s.m_lookat);

            s.m_camera.near = cd / 2;
            s.m_camera.far = cd * 2;
            s.m_camera.aspect = 1;
            let r = _boxsize * Math.sqrt(3);  // box encompassing radius: _boxsize is half-width
            let ang = Math.asin(r/cd);
            ang *= ShadowP.extraWidth;
            s.m_camera.fov = Math.min(175, 2 * ang * 180/Math.PI);  // fov is independent of _boxsize; just under 20 degrees
        } else {
            s.m_camera.position.x = lx;
            s.m_camera.position.y = ly;
            s.m_camera.position.z = lz;
            var dot = 1 - spread;  // dot for 0 strength at edge of fallout
            var ang = Math.acos(dot);
            s.m_camera.fov = Math.min(175, 2 * ang * 180/Math.PI);
            s.m_camera.near = camera.near;
            s.m_camera.far = camera.far;
            s.tempv.set(ldx, ldy, ldz);
            s.tempv.add(s.m_camera.position);
            s.m_camera.lookAt(s.tempv);

        }

        s.m_camera.updateMatrix();
        s.m_camera.updateMatrixWorld();
        s.m_camera.updateProjectionMatrix();
        s.m_camera.matrixWorldInverse.copy(s.m_camera.matrixWorld).invert();

        uniforms['lightProjectionMatrix' + num].value = s.m_camera.projectionMatrix;
        uniforms['lightViewMatrix' + num].value = s.m_camera.matrixWorldInverse;
        const ln = Math.log, v = uniforms._camd.value;
        v.x = s.m_camera.near;
        v.y = 1 / (s.m_camera.far - s.m_camera.near);
        v.z = ln(s.m_camera.near);
        v.w = 1 / (ln(s.m_camera.far) - ln(s.m_camera.near));
        copyFrom(uniforms['light_camd' + num].value, v);

        var drt = s.m_depthRenderTarget;
        render_camera = s.m_camera;
        render_depth(genes, drt);
        render_camera = camera;
        uniforms['depthTexture' + num].value = s.m_depthTexture; // drt.texture;
    };

    /** init (or reinit) the Shadows, with optional precision
    called automatically from TrackCamera if needed.
    */
    function init(uniforms) {
        // http://stackoverflow.com/questions/13914959/three-js-memory-management
        // if (s.m_depthRenderTarget) renderer.deallocateRenderTarget(s.m_depthRenderTarget);
        if (s.m_depthRenderTarget) s.m_depthRenderTarget.dispose();

        // create the camera, details will be filled in dynamically
        s.m_camera = new THREE.PerspectiveCamera(90, 1, 40, 13500);

        var targetRes = ShadowP.size;
        s.m_depthTexture = new THREE.DepthTexture(targetRes,targetRes, isWebGL2 ? THREE.FloatType : THREE.UnsignedShortType);

        s.m_depthRenderTarget = WebGLRenderTarget(targetRes,targetRes, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            //format: THREESingleChannelFormat,
            format: THREE.RGBAFormat,
            // type: THREE.FloatType},
            type: THREE.UnsignedByteType   // now that we are using the depth map this data is ignore, make as small as poaaible
        }, 'shadows' + num);
             //type: THREE.UnsignedByteType} );
        s.m_depthRenderTarget.texture.generateMipmaps = false;
        s.m_depthRenderTarget.depthTexture = s.m_depthTexture;

        if (!uniforms.textureResolution) {
            uniforms.textureResolution = { type: "f", value: targetRes  };
        }
        if (!uniforms['lightProjectionMatrix' + num]) {
            uniforms['lightProjectionMatrix' + num] = { type: "m4", value: new THREE.Matrix4() };
            uniforms['lightViewMatrix' + num] = { type: "m4", value: new THREE.Matrix4() };
            uniforms['depthTexture' + num] = { type: "t"  }; // fill in value dynamically later
            uniforms['light_camd' + num] = { type: "v4", value: new THREE.Vector4()  }; // fill in value dynamically later
        }
        uniforms.textureResolution.value = targetRes;
        trysetele("shadr" + targetRes, "checked", true);
        saveInputToLocal();
    }

    /** cleanup resources */
    s.cleanup = function shadowclean() {
        cdispose(s.m_depthRenderTarget);
        s.m_depthRenderTarget = undefined;
    };

}
ShadowP.size = 512;   // default

/** set the size, new ones will be made as and when needed */
ShadowP.setSize = function(size) {
    ShadowP.size = size;
    ShadowP.cleanup();
};

var Shadows = [ new ShadowP(0), new ShadowP(1), new ShadowP(2) ];
ShadowP.cleanup = function() {
    for (var s =0 ; s<Shadows.length; s++) Shadows[s].cleanup();
};



function makeShadowGUIVR() {
    if (!(dat && V)) return;
    var gui = dat.GUIVR.createX("Shadow debug");
    Shadows.forEach(shadow=>gui.addImageButton(()=>{}, shadow.m_depthRenderTarget, true));
    gui.name = 'makeShadowGUIVR';
    gui.scale.set(300, 300, 300);
    V.rawscene.add(gui);
}
