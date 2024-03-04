'use strict'
// to see smoothed/averaged distance map
var CSynth, THREE, numInstances, rrender, camera, uniforms, adduniform, WebGLRenderTarget, vec4, springs, S, GX, V, guiFromGene, U, Maestro, genedefs

CSynth.SpringSmooth = function springSmooth() {
    const me = this;
    me.running = false;

    let rt1, rt2, scene
    let steps = 0;


    function jitinit() {
        const vertexShader = /*glsl*/`${CSynth.vert300}
            in vec3 position;
            void main() {
            vec3 pos = position;
            gl_Position = vec4(pos, 1.0);
            }
        `

        const fragmentShader = /*glsl*/`${CSynth.frag300}
            // uniform sampler2D posNewvals;
            ${CSynth.CommonShaderCode()}
            uniform sampler2D lastSpringSmooth;
            uniform vec4 springSmoothDamp;  // 0 for 'average', also used for hits, 1,2 for different damps, 4 for hits'
            #define damp springSmoothDamp
            uniform float springSmoothHitDist; //
            uniform float pushapartpow;
            #define smoothed pc_fragColor

            // gl_FragCoord
            void main() {
                // for now (13 Feb 2024) we are putting all the contact<=>distance logic here to simplify matrix.
                // Smoothed values (xyz) are saved in distance units, but smoothing is done in contact units.
                // We don't bother with contactMult, the smoothing is in scaled contact units but should be fine.
                // In the longer term it may be better to move some of this to matrix?
                float contactPowi = pushapartpow - 1.;
                // contactPowi = 1.;
                float contactPow = 1. / contactPowi;
                vec3 pos1 = texelFetch(posNewvals, ivec2(0, gl_FragCoord.x), 0).xyz;    // current positions
                vec3 pos2 = texelFetch(posNewvals, ivec2(0, gl_FragCoord.y), 0).xyz;
                vec4 os = texelFetch(lastSpringSmooth, ivec2(gl_FragCoord.xy), 0);      // old smoothed values, dist space
                os.xyz = max(os.xyz, 1e-5);
                os.xyz = pow(os.xyz, vec3(contactPowi));                                // old values, contact space
                float nd = length(pos1 - pos2);                                         // new distance
                float nc = pow(nd, contactPowi);                                        // new distance, contact space
                float nh = nd < springSmoothHitDist ? 1. : 0.;                          // new hits
                smoothed = os * damp + vec4(nc, nc, nc, nh) * (1. - damp);              // smoothed outputs
                smoothed.xyz = pow(smoothed.xyz, vec3(contactPow));                     // saved in dist space
            }
        `

        const mat = new THREE.RawShaderMaterial({vertexShader, fragmentShader, uniforms});
        const geom = new THREE.PlaneGeometry(2,2);
        const mesh = new THREE.Mesh(geom, mat);
        scene = new THREE.Scene();
        scene.add(mesh);
        const rt = function(name) {
            return CSynth.springSmooth1 = WebGLRenderTarget(numInstances, numInstances, {
                depthWrite: false,
                depthTest: false,
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            }, name, true);
        }
        rt1 = rt('springSmooth1')
        rt2 = rt('springSmooth2')
        U.lastSpringSmooth = rt2.texture;

        CSynth.springSmoothReset();
    }  // end jitinit

    let guidamp = vec4(0, 2,3, 0);
    let damp = CSynth.springSmoothStepDamp = vec4(0, 0.8, 0.9, 0);
    adduniform('lastSpringSmooth'); // , rt2.texture);
    adduniform('springSmoothDamp', damp);
    adduniform('springSmoothHitDist', 12);

    CSynth.springSmoothStep = function springSmoothStep(force = false) {
        if (!me.running && !force) return;
        if (!rt1) jitinit();   // jit
        [rt1, rt2] = [rt2, rt1];
        uniforms.lastSpringSmooth.value = rt1.texture;
        damp.y = 1 - 10**-guidamp.y
        damp.z = 1 - 10**-guidamp.z
        damp.x = damp.w = 1 - 1/(steps+1);
        uniforms.damp.value = damp;
        rrender('springSmooth', scene, camera, rt2)
        CSynth.springSmoothRT = rt2;
        uniforms.lastSpringSmooth.value = rt2.texture;  // for users of springSmooth
        steps++;
    }

    CSynth.springSmoothReset = function springSmoothReset() {
        steps = 0;
        let save = guidamp.clone();
        guidamp.set(0,0,0,0);
        CSynth.springSmoothStep(true);
        guidamp.copy(save);
    }

    let _receninterval = 0, _recenid = -1;
    Object.defineProperty(CSynth, 'springRecentreInterval', {
        get: () => _receninterval,
        set: v => {
            if (_recenid !== -1) {clearInterval(_recenid); _recenid = -1;}
            _receninterval = v;
            springs.reCentre();
            if (v !== 0) _recenid = setInterval(() => springs.reCentre(), _receninterval*1000);
        }
    });

    CSynth.makeSpringSmoothGui = async function() {
        const u = undefined;
        await S.waitVal(() => GX.getgui('more...'))
        const ssg = CSynth.springSmoothGui = V.gui.addFolder('spsmooth');
        // object, propertyName, min, max, step, guiname, tooltip, listen=true) {
        ssg.add(me, 'running', u,u,u, 'running', 'is the step smoothing process running?').showInFolderHeader();
        ssg.addButton(() => CSynth.springSmoothReset(), 'reset', 'reset the smoothing memory');
        ssg.add(guidamp, 'y', 0, 5, 0.1, 'a_damp', 'damping for smootha');
        ssg.add(guidamp, 'z', 0, 5, 0.1, 'b_damp', 'damping for smoothb');
        ssg.add(U, 'springSmoothHitDist', 0, 20, 0.1, 'contact dist', 'distance for two particles to count as contact');
        guiFromGene(ssg, 'pushapartpow');


        genedefs.noiseforce.max = 2; guiFromGene(ssg, 'noiseforce');
        genedefs.noisefieldforce.max = 10; guiFromGene(ssg, 'noisefieldforce');
        guiFromGene(ssg, 'noisefieldscale');
        guiFromGene(ssg, 'noisefieldtimefac');
        guiFromGene(ssg, 'noisefieldpartfac');
        guiFromGene(ssg, 'noisefieldmod');
        genedefs.springmaxvel.max = 10; guiFromGene(ssg, 'springmaxvel');
        ssg.addButton(() => springs.reCentre(), 'recentre', 'recentre the model');
        ssg.add(CSynth, 'springRecentreInterval', 0, 10, 0.1, 'recen interval', 'interval to recentre');
        //frameInterval?
        //kick?

    }
    CSynth.makeSpringSmoothGui();

    // TODO, this allows for restart of CSynth.springSmooth, but not for other users of postSpringStepFns
    // springs.postSpringStepFns[0] = CSynth.springSmoothStep;
    Maestro.on('postspringsubstep', () => CSynth.springSmoothStep());


    /* for gui

U.springSmoothHitDist = 12
Object.assign(G, {springmaxvel: 1000, noiseforce: 0, noisefieldforce: 20, noisefieldscale: 1, noisefieldtimefac: 1, noisefieldpartfac: 1, noisefieldmod: 1})
U.springSmoothDamp.set(0,0.99,0.8,1);

     */

}
CSynth.springSmooth = new CSynth.SpringSmooth()

/* experiment
CSynth.springSmooth();
CSynth.springSmoothReset(); for (i = 0; i < 50; i++) {CSynth.randpos(); springs.step(200); await S.frame(50); log(i)}
*/