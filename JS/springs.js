'use strict';

// declarations to prevent 'undeclared global' and work towards namespace cleanup
var THREE, renderer, horn, kinect, resetMat, Maestro, opmode, usemask, badshader, W,
serious, dat, setthresh, WebGLRenderTarget, rrender, newscene, getdata, substituteVirtualShaderCode, doInclude,
ColorKeywords, parseUniforms, log, changeMat, newmain, setval, ugene, trysetele, setInput, readWebGlFloat, readWebGlFloatDirect,
writetextremote, guiFromGene, ffloat, V, setspringshaders, springdemo, CSynth, G, vivepick, pick, nop,
nomess, msgfix, msgfixlog, guifilter, DNASprings, msgfixerror, scaleDampTarget1, getSpringUniforms, addgeneperm, inworker,
genedefs, nextpow2, uniforms, GX, gl, onframe, maxTextureSize, EX, format, newTHREE_DataTextureNamed, framedelta, THREESingleChannelFormat,
testes300, isWebGL2, searchValues, randvec3, GUINewsub, GUISubadd, U, tmat4;

// for mutate
var mutate, vps, setViewports, slots, setObjUniforms, S, slowMutate;

var springs; // 'main' instance of springs

var Springs = function(id = '') {
    //if (meX) serious("attempt to reset springs");
    const me = this;
    onframe(() => me.MAXPARTICLES = maxTextureSize);
    const meX = this; //refactoring to remove global 'springs' references.
    let posWorkhist, posNewvals, posHist;
    let MAX_DEFS_PER_PARTICLE; // = 8;              // total  number of definitions per particle, inclduing 'special' ones
    let DEFWIDTH = 4;                           // number of fields per entry, eg 4 for  otherid, len, strength, power
    let PARTSTEP; //  = MAX_DEFS_PER_PARTICLE * DEFWIDTH;  // step to move to next particle
    let SPSTART = 0;                            // start for 'specials'
    me.NUMSPECIALS = 3;                        // numner of special springs for each particle
    me.SPEND = -999; // = MAX_DEFS_PER_PARTICLE - NUMSPECIALS;      // last regular, first special
    let RODPOS;                              // rod special
    let FIXPOS;                             // fixed special
    let PULLPOS;                             // pull to point special
    let SPECIALPOS;                          // extra specials added by patch ()eg tadpoles)
    const WORKHISTLEN = 4;
    let HISTLEN = 64;
    let numInstances = -99  ;               // number of active particles
    let numInstancesP2 = numInstances;      // size of particle buffers, also space for 'extra' particles
    let EXTRASPACE = 16;                    // space for extra particles
    let old;                                 // last details, for changing resolution of same model
    const NOSPRING = me._NOSPRING = -(2**126);              // flag to indicate  spring
    me.id = id;
    const ROLEFORCESLENGTH = me._ROLEFORCESLENGTH = 16;
    const DEFTYPE = ROLEFORCESLENGTH+1; // not too large or fractional part of type will be lost
    let springUniforms, parms;
    let topologybuff;

    me.nonp2 = false;                  // can be set to true to allow any size for letious textures

    // me.setWORKHISTLEN = function(v) { WORKHISTLEN = v; posWorkhist = undefined; };
    me.setHISTLEN = function(v) {
        HISTLEN = v;
        posHist = undefined;
        springs.settleHistory();  // settleHistory will do setup()
     };
    me.getHISTLEN = function() { return HISTLEN; };
    me.setMAX_DEFS_PER_PARTICLE = function(v) {
        if (MAX_DEFS_PER_PARTICLE === v) return;
        MAX_DEFS_PER_PARTICLE = v;
        PARTSTEP = MAX_DEFS_PER_PARTICLE * DEFWIDTH;  // step to move to next particle
        const SPEND = me.SPEND = MAX_DEFS_PER_PARTICLE - me.NUMSPECIALS;      // last regular, first special
        RODPOS = SPEND;                         // rod special
        FIXPOS = SPEND + 1;                     // fixed special
        PULLPOS = SPEND + 2;                    // pull to point special
        SPECIALPOS = SPEND + 3;                 // extra specials added by patch ()eg tadpoles)


        topologybuff = undefined; // defer resettoplogy(); until all sizes ready and new spring defined
        if (me.newmat) me.newmat();
    }

    /** set up # particles, and return necessary particle array size numInstancesP2 */
    me.setPARTICLES = function(v, e = EXTRASPACE) {
        if (!me.uniforms) {
            if (getSpringUniforms) [springUniforms, parms] = getSpringUniforms(me); // but not in worker
            me.uniforms = springUniforms;
        }

        if (numInstances === v && EXTRASPACE === e) return;
        if (posWorkhist)
            old = {/** posw: posWorkhist, **/ posn: posNewvals, numInstances: me.numInstances, numInstancesP2: me.numInstancesP2};
        EXTRASPACE = e;
        meX.numInstances = numInstances = v;
        meX.numInstancesP2 = numInstancesP2 = me.nonp2 ? (v + EXTRASPACE) : nextpow2(v + EXTRASPACE);
        if (numInstancesP2 > springs .MAXPARTICLES)
            serious('springSize', 'request springs numInstancesP2', numInstancesP2, 'exceeds max', springs .MAXPARTICLES);
        if (me === springs) { window.numInstances = numInstances; window.numInstancesP2 = numInstancesP2; }
        springUniforms.numInstances.value = numInstances;
        springUniforms.numInstancesP2.value = numInstancesP2;

        posWorkhist = posHist = posNewvals = undefined;
        topologybuff = undefined;   // defer resettopology until all values known
        if (!me.letY) me.newmat();  // if letY particles can change dynamically without shader recompile
        return numInstancesP2;
    };
    me.getPARTICLES = () => numInstances;

    let workhisttime, histtime;  // local copy in case gene/uniform value overwritten, range 0..1
    let lasthisttime = 0;  // time (timer time) last history step saved
    me.parms = parms;
    me.getStepsSoFar = () => springUniforms.stepsSoFar.value;

    me.setMAX_DEFS_PER_PARTICLE(8);

    let geom, scene, line, camera, histCopyScene, copyMesh, copyGeom, copyGeom1, copyMaterial;

    me.createGUIVR = function() {
        if (!CSynth) return;  // CSynth specific for now
        if (me.id) {
            log("TODO::: GUIVR for extra Spring sets...");
            return;
        }
        let gui = dat.GUIVR.createX("Simulation settings");
        const xx = { get running() {return !!meX.running}, set running(v) {if (v) meX.start(); else meX.stop();} }
        gui.add(xx, 'running').name('dynamics running').listen().showInFolderHeader();
        // gui.add(CSynth, 'separateRepresentatives').name('normalize scaling').listen();
        const sources = CSynth.representativeSources;
        gui.add(CSynth, 'separateRepresentatives', sources).name('normalize scaling').listen();
        // CSynth.colourGUIs.push(gui.add(xx, 'source', sources).name("Colour source:").listen());

        // guiFromGene(gui, "springforce");  // note: does not match gene def above
        guiFromGene(gui, "xyzforce");
        guiFromGene(gui, "contactforce");
        //guiFromGene(gui, "contactforce2");
        //guiFromGene(gui, "contactforce2pow");
        //let gd = genedefs.pushapartforce; gd.togui = Math.log10; gd.min = 0.000001; gd.max = 10;
        //guiFromGene(gui, "pushapartforce", "pushapartforceL");
        guiFromGene(gui, "pushapartforce");
        guiFromGene(gui, "pushapartpow");
        if (CSynth.current.showLorentzian) {
            const xxx = {
                get autoAlign() { return !!meX.alignMaestro; },
                set autoAlign(b) {
                    if (b && !meX.alignMaestro) {
                        meX.alignMaestro = Maestro.on('postframe', () => CSynth.alignModels());
                        const tt = CSynth.springSettings.current;
                        CSynth.alignModels(tt);
                        CSynth.alignForces(tt);
                        GX.guilist.forEach(g => {if (g.mostName().endsWith('force')) g.normalizeRange(0.2)});
                    } else if (!b && meX.alignMaestro) {
                        meX.alignMaestro = Maestro.remove('postframe', meX.alignMaestro);
                    }
                }
            }

            gui.add(xxx, 'autoAlign').listen()
                .setToolTip(`Keep parameters for CSynth and Lorenz models aligned.\nChanges to either will force corresponding changes to the other.`);
            guiFromGene(gui, "m_force");
            guiFromGene(gui, "m_alpha");
            guiFromGene(gui, "m_c");
            guiFromGene(gui, "m_k");
        }
        guiFromGene(gui, "pushapartlocalforce");
        guiFromGene(gui, "backboneforce");
        guiFromGene(gui, "springpow");
        guiFromGene(gui, "springrate");
        let cctiff = CSynth.current.imagetiff;
        if (cctiff) {
            let _useImage = false;
            const xxu = {
                get useImage() { return _useImage; },
                set useImage(v) {
                    _useImage = v;
                    CSynth.useImage({opacity: 0.5, remove: !_useImage})
                }
            }
            gui.add(xxu, 'useImage').listen().setToolTip('use three colour image\nfor course separation');
            guiFromGene(gui, 'gradforce').onChange( () => {
                if (CSynth.gradInst && !CSynth.gradInst.gradTextureData) {
                    CSynth.gradInst.gradUse();
                }
            });
        }

        //guiFromGene(gui, "nonBackboneLen");
        //guiFromGene(gui, "backbonetorsionspringforce");
        //gui.add(parms, "gravity", -0.001, 0.001);


        const _sgui = GUINewsub("More ...");
        // gui.add(W, 'threshold', 0, 150).listen().name("Spring threshold").onChange(setthresh);

        const bb = [3,
            { func: CSynth.setAlignmentTarget, tip: "Use current positions to set the alignment for future align requests", text: 'set align' },
            { func: CSynth.alignConformationNow, tip: "Fix current positions and align to preset target", text: 'use align' },
            { func: springs.perturbPos, tip: "Perturb postions", text: 'Perturb postions' },
            { func: ()=>springs.step(10), tip: '10 spring steps', text: 'step 10' },
            { func: ()=>springs.step(100), tip: '100 spring steps', text: 'step 100' },
            { func: ()=>springs.step(1000), tip: '1000 spring steps', text: 'step 1000' },
        ];
        _sgui.addImageButtonPanel.apply(_sgui, bb).setRowHeight(0.100);


        CSynth.addSpringSourceGUI(_sgui);
        guiFromGene("stepsPerStep");
        guiFromGene("damp");
        guiFromGene("powBaseDist");
        guiFromGene("minActive");
        guiFromGene("maxActive");
        guiFromGene("maxBackboneDist");
        guiFromGene("noiseforce");
        guiFromGene("backboneScale");

        GUISubadd(DNASprings,  'stretch').listen();
        guiFromGene("springspreaddist");
        guiFromGene("fractforce");
        guiFromGene("fractpow");
        guiFromGene("pullspringforce");

        const yy = { get boosting() {return !!CSynth.boostsprings.mid}, set boosting(v) { CSynth.boostsprings(v);} }
        GUISubadd(yy, 'boosting').name('boost springs').listen()
            .setToolTip('boost springs by moving mouse over matrix\nset strengh and boostrad  below to tailor');

        const zz = { get strength() {return G.boostfac < 1 ? 0 : Math.log10(G.boostfac)}, set strength(v) { G.boostfac = v <= 0 ? 0 : Math.pow(v, 10);} }
        GUISubadd(zz, 'strength',0, 10).step(0.1).name('strength').listen();
        guiFromGene('boostrad');
        guiFromGene('patchwidth');
        guiFromGene('patchval');
        guiFromGene('perturbScale');

        return gui;
    }

    /** set up the letious buffers, if not already correct
     */
    me.setup = function() {
        if (numInstances === -99) return log('springs .setup called before numInstances');
        // if (!me.material) me.newmat();

        if (!springUniforms.roleforces) {
            springUniforms.roleforces = { type: 'fv', value: new Array(ROLEFORCESLENGTH).fill(1)};
            springUniforms.roleforcesFix = { type: 'fv', value: new Array(ROLEFORCESLENGTH).fill(0)};
        }


        const newworkhist = !posWorkhist || posWorkhist.width !== WORKHISTLEN || posWorkhist.height !== numInstancesP2;
        const newnewvals = !posNewvals || posNewvals.height !== numInstancesP2;
        const newhist = HISTLEN !== 0 && (!posHist || posHist.width !== HISTLEN || posHist.height !== numInstancesP2)
            || posHist && meX.filter && meX.filter !== posHist.texture.minFilter;  // spring.filter may be set for debug purposes
        if ( (newhist && posHist) || (newnewvals && posNewvals) || (newworkhist && posWorkhist) )
            console.error('unexpected values in springs.setup()');

        if (newworkhist || newhist || newnewvals) { // at start or after change
            // me.newmat();

            // find best we can do for linear filter and repeat wrapping
            let linfilt = renderer.extensions.get('OES_texture_float_linear') && !me.nonp2 ? THREE.LinearFilter : THREE.NearestFilter;
            let repeatwrapping = me.nonp2 ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
            const mirroredrepeatwrapping = me.nonp2 ? THREE.ClampToEdgeWrapping : THREE.MirroredRepeatWrapping;
            // linfilt = THREE.NearestFilter;

            // WebGLRenderTarget modified to dispose previous value

            if (newhist && HISTLEN !== 0) {
                posHist = WebGLRenderTarget(HISTLEN, numInstancesP2, {
                    minFilter: linfilt,
                    magFilter: linfilt,
                    wrapS: repeatwrapping,
                    wrapT: THREE.ClampToEdgeWrapping,
                    format: THREE.RGBAFormat,
                    type: THREE.FloatType
                }, 'spring.posHist' + id );
                posHist.texture.generateMipmaps = false;
            } else {
                posHist = undefined;
            }
            me.posHist = posHist;  // for external debug

            if (newworkhist) {
                posWorkhist = WebGLRenderTarget(WORKHISTLEN, numInstancesP2, {
                    minFilter: THREE.NearestFilter,
                    magFilter: THREE.NearestFilter,
                    wrapS: repeatwrapping,
                    wrapT: THREE.ClampToEdgeWrapping,
                    format: THREE.RGBAFormat,
                    type: THREE.FloatType
                }, 'spring.posWorkhist' + id  );
                posWorkhist.texture.generateMipmaps = false;
                me.posWorkhist = posWorkhist;  // debug
            }

            if (newnewvals) {
                posNewvals = WebGLRenderTarget(1, numInstancesP2, {
                    minFilter: linfilt,
                    magFilter: linfilt,
                    wrapS: repeatwrapping,
                    wrapT: THREE.ClampToEdgeWrapping,
                    format: THREE.RGBAFormat,
                    type: THREE.FloatType
                }, 'spring.posNewvals' + id  );
                posNewvals.texture.generateMipmaps = false;
                me.posNewvals = posNewvals;  // for external debug
            }

            // me.clearall();
            springUniforms.posWorkhist.value = posWorkhist.texture;
            springUniforms.posHist.value = posHist && posHist.texture;
            springUniforms.posNewvals.value = posNewvals.texture;
            workhisttime = 0.5/WORKHISTLEN;
            histtime = 0.5/HISTLEN;
            springUniforms.stepsSoFar.value = 0;    // old loadopen side-effect now mst be explicit somewhere
            lasthisttime = -99999;
            springUniforms.WORKHISTLEN.value = WORKHISTLEN;
            springUniforms.HISTLEN.value = HISTLEN;
            // me.resettopology();

            // TO CHECK, non power 2 numInstances (eg 132) gives odd result
            // also WORKHISTLEN > 256
            // scene etc for doing real spring work and saving result in posNewvals
            // input is complete posWorkhist, output is single workhisttime posNewvals
            if (!scene) {
                scene = newscene('springsreal');
                geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,-1,0, 0,2,0]), 3));
                //geom.vert ices[0] = new THREE.Vector3(0, -1, 0);  // extra at each end, otherwise last particle gets marooned
                //geom.vert ices[1] = new THREE.Vector3(0, 2, 0);
                line = new THREE.Line(geom, me.material);
                line.frustumCulled = false;
                scene.addX( line );
                camera = new THREE.OrthographicCamera( -1,1,1,-1, -1, 1 );
                camera.matrixAutoUpdate = false;

                // scene etc for copying posNewvals back to correct workhisttime slice of posWorkhist
                // needs a real mesh, textured line doesn't seem to work
                histCopyScene = newscene('springtoworkhist');
                histCopyScene.matrixAutoUpdate = false;
                copyMaterial = new THREE.MeshBasicMaterial();
                copyMaterial.map = posNewvals.texture;
                copyMaterial.depthTest = false;
                copyMaterial.depthWrite = false;
                copyGeom = new THREE.PlaneGeometry(2, 2 );
                copyGeom1 = new THREE.PlaneGeometry(2, 2 );     // for copy posHist => posNewvals
                copyMesh = new THREE.Mesh(copyGeom, copyMaterial);
                copyMesh.matrixAutoUpdate = false;
                copyMesh.frustumCulled = false;
                histCopyScene.add( copyMesh );
            }
            copyMaterial.map = posNewvals.texture; //
        }
    };
    // nb distbuff was inappropriately named xyzbuff.
    // The name xyzforce is still used though distforce would be more appropriate
    let distbuff;
    me.initdistbuff = function() {
        const n = numInstancesP2;
        const data = new Float32Array(n*n);
        distbuff = newTHREE_DataTextureNamed('distbuff', data, n, n, THREESingleChannelFormat, THREE.FloatType);
        distbuff.magFilter = distbuff.minFilter = THREE.NearestFilter;
        distbuff.needsUpdate = true;
        springUniforms.distbuff.value = distbuff;
        return distbuff;
    }

    me.setDistSpring = (x, y, length=1) => {
        if (x > numInstances || y > numInstances) return false;
        if (!distbuff) return false;
        const data = distbuff.image.data;
        const i = (x + y*numInstancesP2);
        data[i] = length;
        distbuff.needsUpdate = true;
        return true;
    }

    me.postSpringStepFns = [];
    //was going to have this be more 'addEventListener' rather than single callback
    //actually, ATM only using for one thing, and accumulating listeners could be slightly bad.
    //I've now made annotation spring listener only work when annotation group is visible.
    me.onPostSpringStep = fn => me.postSpringStepFns.push(fn);

    me.defaultLogint = 0;

    /** perform stepsPerStep simulation steps
     * also perform (re)initialization if necessary
     * @returns {undefined}
     */

    let targsteps = 0, donesteps = 0;
    me.steps = [];  // debug log
    me.step = function springstep(steps, logint=me.defaultLogint) {
        if (!me.id) parms = G; //keeping a ref to G isn't enough to ensure proper buffer swap
        if (steps === undefined || steps.maestro) {
            console.error('springs .step now expects an explicit steps parameter');
            steps = parms.stepsPerStep; // maestro detects unused maestro parameter
        }
        if (!me.material) me._buildnewmat();
        me.setup();
        copyMaterial.map = posNewvals.texture;

        if (steps < 0) {
            targsteps -= framedelta * steps;
            steps = Math.round(targsteps - donesteps);
            donesteps +=  steps;
            if (steps > 500) targsteps = donesteps = 20;  // in case of hiccup
        }
        me.steps.push(steps);
        if (me.steps.length > 100) me.steps.splice(0,50);

        // if we have more than one instance of springs around, we need to disambiguate.
        // In fact there may be other ways in which Maestro in general should often be replaced with more normal EventEmitters...
        // In this instance, the 'prespringstep' is used precisely once, and 'postspringstep' never, so very easy to change...
        Maestro.trigger('prespringstep' + me.id);
        // now perform simulation steps
        let sopmode = opmode;  // save in case this is called during another operation, eg during setup
        opmode = "springs" + me.id;
        for (let i=0; i < steps; i++) {
            // if correct time, save posNewvals into histtime slice of posHist
            // save BEFORE any spring steps to ensure good capture at start of record cycle
            if (posHist) {
                let now = Date.now();
                while (now >= lasthisttime + 1000/parms.histStepsPerSec) {
                    if (me.log) log("hist delta=", now-lasthisttime);
                    if (savehist()) return;   // savehist, unless it detects end of record
                    lasthisttime += 1000/parms.histStepsPerSec;
                    if (now > lasthisttime + 250) {
                        lasthisttime = now;  // got >250ms behind
                        log('fell behind, record', histtime, springUniforms.stepsSoFar.value);
                    }
                }
            }

            if (logint && i%logint === 0) log('spring steps' + i);
            if (Date.now() === 0) debugger;
            // perform simulation and render the result slice into posNewvals
            springUniforms.posWorkhist.value = posWorkhist.texture;
            //renderer.clearTarget(posNewvals);
            rrender("springstep"+me.id, scene, camera, posNewvals);  // camera ignored
            springUniforms.stepsSoFar.value++;

            // render posNewvals into new slice of posWorkhist
            saveworkhist();

        }
        opmode = sopmode;

//springshowpix();
//log(">>>>>>>>>>>>>>>>>>>>>>", uniforms.stepsSoFar.value);
        renderer.setRenderTarget(null);  // possibly avoid pollution, should be reset elsewhere as needed
        let s = new THREE.Vector2();
        s = renderer.getSize(s);
        renderer.getContext().flush(); // not sure why, but this stops extreme jitter, especially in ANGLEsprints

        newmain();  // ensure active springs keep display up to date
        Maestro.trigger('postspringstep' + me.id);  // this allows normal register/deregister
        me.postSpringStepFns.forEach(f => f(me));   //actually, maybe I want to callback slightly earlier...
    };

    /** clear all springs XXX:: consider distbuff */
    me.clearall = function() {
        renderer.setClearColor(ColorKeywords.black);     //< use main viewport color for clearing the canvas
        if (posHist) renderer.clearTarget(posHist, true, true, true);
        if (posWorkhist) renderer.clearTarget(posWorkhist, true, true, true);
        if (posNewvals) renderer.clearTarget(posNewvals, true, true, true);
    };

    // get workhist, in integers 0..3
    me.getWorkhisttime = function() {
        return Math.floor(workhisttime * WORKHISTLEN);
    }

    /** save current value into next frame of work history */
    function saveworkhist() {
        // move one step on in workhist circular buffer
        workhisttime += 1 / WORKHISTLEN;
        if (workhisttime > 1) workhisttime -= 1;
        springUniforms.workhisttime.value = workhisttime;

        copyMaterial.map = posNewvals.texture;
        // make sure we just hit the correct slice
        copyMesh.matrix.elements[0] = 1 / WORKHISTLEN;
        copyMesh.matrix.elements[12] =  workhisttime * 2 - 1;
        copyMesh.matrixWorld.copy(copyMesh.matrix);
        copyMesh.geometry = copyGeom;

        rrender("springsaveworkhist", histCopyScene, camera, posWorkhist, false);
    }

    let mcscene, mcmat, mcgeom, mcmesh;
    /** set the new workhist from the old */
    me.copyworkhist = function() {
        if(!mcscene) {
            mcscene = newscene('mcscene');
            mcmat = new THREE.MeshBasicMaterial();
            mcmat.depthTest = false;
            mcmat.depthWrite = false;
            mcgeom = new THREE.PlaneGeometry(2, 2);
            mcmesh = new THREE.Mesh(mcgeom, mcmat);
            mcmesh.frustumCulled = false;
            mcscene.add(mcmesh);
        }
        const t = old.posn.texture;
        if (t.magFilter !== THREE.LinearFilter) {
            t.minFilter = t.magFilter = THREE.LinearFilter;
            t.needsUpdate = true;
        }
        mcmat.map = t;
        // // 0,1 y=1,  2,3 y=-1
        // mcgeom.vertices[0].y = mcgeom.vertices[1].y = (me.numInstances/me.numInstancesP2 * 2 - 1);
        // const fv = mcgeom.faceVertexUvs[0];
        // fv[0][0].y = fv[0][2].y = fv[1][2].y = old.numInstances/old.numInstancesP2;
        //mcgeom.uvsNeedUpdate = true;
        //mcgeom.verticesNeedUpdate = true;
        mcgeom.attributes.position.array[1] = mcgeom.attributes.position.array[4] = (me.numInstances/me.numInstancesP2 * 2 - 1);
        mcgeom.attributes.uv.array[1] = mcgeom.attributes.uv.array[3] = old.numInstances/old.numInstancesP2;
        mcgeom.attributes.position.needsUpdate = true;
        mcgeom.attributes.uv.needsUpdate = true;

        rrender("springmccopy", mcscene, camera, posWorkhist, false);

    }
    me.saved = [];
    /** save current value into next frame of history */
    function savehist() {
        if (!posHist) return;
        // move 'current' history time on one slot in circular buffer
        histtime += 1/HISTLEN;
        if (histtime > 1) {
            histtime -= 1;
            if (me.recording) {
                me.stop();
                me.recording = false;
                // springUniforms.histtime.value = histtime;
                return true; // to stop spring steps
            }
        }
        springUniforms.histtime.value = histtime;

 // >>>>>>>>>>>>>>>>> TODO use copy here ...
        // render the posNewvals into the new histtime slice of posHist
        // renderer.clearTarget(posHist, false, true, false);

        // textureCopy wrong way round, and maybe clips to 0..1?
        //let tt = histtime * HISTLEN - 0.5;
        //textureCopy(posNewvals, posHist, tt, 0, 0,0, 1, numInstancesP2);
        //return;

        //scene1.scale.x = 0.1 / HISTLEN; scene1.position.x = histtime * 2 - 1;    // make sure we just hit the correct slice
        //scene1.updateMatrix();
        //scene1.updateMatrixWorld();
        copyMesh.matrix.elements[0] = 0.1 / HISTLEN;
        copyMesh.matrix.elements[12] = histtime * 2 - 1;
        copyMesh.matrixWorld.copy(copyMesh.matrix);
        copyMaterial.map = posNewvals.texture;
        copyMesh.geometry = copyGeom;
        rrender("springsavehist", histCopyScene, camera, posHist, false);
        let s = new THREE.Vector2();
        s = renderer.getSize(s);
        renderer.setRenderTarget(null);  // possibly avoid pollution, should be reset elsewhere as needed
        me.saved[Math.floor(histtime*HISTLEN)] = springUniforms.stepsSoFar.value;
        return false;
    }

    me.restoreHist = function(slot) {
        copyMaterial.map = posHist.texture;
        const uv = copyGeom1.attributes.uv.array;
        uv[0] = uv[2] = uv[4] = uv[6] = slot;
        copyMesh.matrix.identity();
        copyMesh.matrixWorld.copy(copyMesh.matrix);
        copyGeom1.attributes.uv.needsUpdate = true;
        copyMesh.geometry = copyGeom1;
        rrender("springsavehist", histCopyScene, camera, posNewvals, false);
    }

    /** force all history same as current frame */
    me.settleHistory = function() {
        if (!histCopyScene) me.setup();
        // me.step(8);    // patch because saveworkhist below didn't seem to work
        opmode = 'springs';
        for (let i=0; i<=HISTLEN; i++) {
            savehist();
        }
        for (let i=0; i<=WORKHISTLEN; i++) {
            saveworkhist();  // << TODO not sure why this not working
        }
        histtime = 0.5/HISTLEN;
    };

    /** record one cycle of history */
    me.recordCycle = function() {
        console.clear()
        me.settleHistory();
        me.recording = true;
        histtime = -0.5/HISTLEN;
        // log('record', histtime, springUniforms.stepsSoFar.value);
        me.start();
    }

    let codeOverrides = '', codePrepend = '';

    /** clear the material, build on step */
    me.newmat = function springsnewmat(...xx) {
        if (xx.length !== 0)
            serious('springs.newmat called with argument(s)', xx);
        me.material = undefined;
    }

    /** force recompilation of material, for use during development, or when numInstances changes */
    me.setOverrides = function springssetOverrides(_codeOverrides = '', _codePrepend = '') {
        codeOverrides = _codeOverrides;
        codePrepend = _codePrepend;
        me.newmat();
    }


    /** force recompilation of material, for use during development, or when numInstances changes */
    me._buildnewmat = function springsnewmat() {
        if (!numInstances) { log('attempt to build spring materials before numInstances defined'); return; }  //
        // if (me.let Y && me.last lety === MAX_DEFS_PER_PARTICLE) return;  // pre 29/01/22 had && !force
        // me.last lety = me.let Y ? MAX_DEFS_PER_PARTICLE : 0;

        let [vert, frag] = setspringshaders(me, numInstancesP2, numInstances, MAX_DEFS_PER_PARTICLE);
        //let vert = getdata("shaders/springs .vs?x=" + Date.now());
        //let frag = getdata("shaders/springs .fs?x=" + Date.now());

        //>>> TODO check particles here, may need both particles and numInstancesP2
        if (codePrepend) frag = frag.replace('#define virtual',  '#define virtual' + '\n' + codePrepend + '\n');
        // frag = '#define numInstancesP2 ' + ffloat(numInstancesP2) + '\n' + frag;
        // frag = '#define numInstances ' + ffloat(numInstances) + '\n' + frag;
        // frag = '#define ACTIVERANGE ' + ffloat((numInstances + 0.5)/numInstancesP2) + '\n' + frag;
        // frag = '#define INVPARTICLESP2 ' + ffloat(1/numInstancesP2) + '\n' + frag;

        // frag = '#define MAX_DEFS_PER_PARTICLE ' + ffloat(MAX_DEFS_PER_PARTICLE) + '\n' + frag;

        if (codeOverrides) {
            frag = substituteVirtualShaderCode(frag, codeOverrides);
            // definitely want to do this after substitution in case the substitute has #includes
            frag = doInclude(frag);
            // similarly, substitute might include genes.
            // TODO: deal with these structures properly.
        }
        let shaderGenes = {};
        let textureDefines = [];
        parseUniforms(frag, shaderGenes, textureDefines);
        const [vertpre, fragpre, oppre, glver] = testes300('', '', /*glsl*/`
            precision highp float;
            precision highp sampler2D;
        `);
        vert = oppre + vertpre + vert;
        frag = oppre + fragpre + frag;

        me.material = new THREE.RawShaderMaterial({
            uniforms: springUniforms,
            vertexShader: vert,
            fragmentShader: frag,
            side: THREE.DoubleSide
        });
        if (glver) me.material.glslVersion = glver;

        me.material.depthTest = false;
        me.material.depthWrite = false;
        me.material.linewidth = 1;
        if (line) line.material = me.material;
    };

    // /** experimental method for adding custom code to springs
    //  * Current pre-process steps don't manage to deal with this properly in one code block.
    //  * For now, passing two arguments instead.
    //  */
    // me.testCustomForce = function() {
    //     me.newmat({
    //         codePrepend: /*glsl*/`
    //         //not getting included? Also this comment confuses substitute code...
    //         //if it mentioned the 'v' word it would confuse it even more...
    //         #include pohnoise.fs;

    //         gene(noiseProb, 0, 0, 0.01, 0.00001, 0.00001, simulation, wtf)
    //         gene(noiseAmp, 0, 0, 10, 0.1, 0.01, simulation, wtf)
    //         `,
    //         codeOverrides: /*glsl*/`
    //         override vec3 customForce(vec3 me) {
    //             vec3 force = vec3(0.0);
    //             if (pohnoise(me * stepsSoFar) > noiseProb) {
    //                 force += noiseAmp * vec3(pohnoise(me.xxx), pohnoise(me.yyy), pohnoise(me.zzz));
    //             }
    //             return force;
    //         }
    //     `
    //     });
    // }

    let topologyarr;

    /** clear the topology for given range of particles, default all particles */
    me.clearTopology = function(start = 0, end = numInstances) {
        if (topologyarr) topologyarr.fill(NOSPRING, start * PARTSTEP, end * PARTSTEP);
    }
    /** set up the spring topology infrastucture with no springs
    // This is held in  javascript topologyarr
    // and copied in glsl buffer topologybuff
    // force will make new array and buffer
    */
    me.resettopology = function (force) {
        let alen = numInstancesP2 * PARTSTEP;
        if (!topologyarr || topologyarr.length !== alen || meX.topologyarr !== topologyarr || force) {
            topologyarr = new Float32Array(alen);
            topologybuff = undefined;
        }
        // clear the array, NOSPRING indicates no action on spring
        for (let i=0; i<alen; i++) topologyarr[i] = NOSPRING;

        me.notcreated = [];  // list of bad paired
        me.goodsprings = me.badsprings = 0;
        parms.maxActive = 1; //  (numInstances + 0.5)/numInstancesP2;
        parms.minActive = 0; //  (numInstances + 0.5)/numInstancesP2;
        if (inworker) {
            topologybuff = {}; // dummy
            return;  // in case in webWorker
        }

        const wr = THREE.ClampToEdgeWrapping; // ?? mirroredrepeatwrapping
        if (!topologybuff || topologybuff.width !== MAX_DEFS_PER_PARTICLE || topologybuff.height !== numInstancesP2 ) {
            topologybuff = newTHREE_DataTextureNamed('topologybuff'+me.id, topologyarr, MAX_DEFS_PER_PARTICLE, numInstancesP2, THREE.RGBAFormat,
                THREE.FloatType, undefined, // type,mapping
                wr, wr,
                THREE.NearestFilter,THREE.NearestFilter );
            topologybuff.width = MAX_DEFS_PER_PARTICLE;
            topologybuff.height = numInstancesP2;

            // if (!uniforms.topologybuff) uniforms.topologybuff = { type: "t", value: topologybuff };
            springUniforms.topologybuff.value = topologybuff;
        }
        topologybuff.needsUpdate = true;
    };

    /** Get a spring topology from the cache
     * if none yet create one (setting populated = false)
     * Either way activate it and return it.
     *  */
    me.getSpringCache = function(key) {
        let c = me.springCache[key];
        if (c) {
            topologybuff = c.topologybuff;
            topologyarr = c.topologyarr;
            springUniforms.topologybuff.value = topologybuff;
        } else {
            meX.resettopology(true);
           c =  me.springCache[key] = { topologybuff, topologyarr, populated: false };
        }
        return c;
    }
    me.springCache = {};

    me.getCache = function(key) {

    }

    let contacts;
    Object.defineProperties(me, {
        topologyarr: { get: () => topologyarr },
        topologybuff: {
            get: () => topologybuff,
            set: (v) => {
                topologybuff = v;
                topologyarr = topologybuff.image.data;
                springUniforms.topologybuff.value = v;
                v.needsUpdate = true;
            }
        },
        /** contacts is an object with properties like 'texture' as well as functions for querying the data.
         * Rather than manipulating uniforms.contactbuff.value directly, it is preferred to go via this interface.
         */
        contacts: {
            get: () => contacts,
            set: (v) => {
                //TODO: more robust type check etc.
                contacts = v;
                if (!v) return;
                me.uniforms.contactbuff.value = v.texture;
            }
        }
    });

    /** set up a demo topology with backbone and pinch */
    me.demotopology = function(numparticles) {
        if (numparticles) me.setPARTICLES(numparticles);
        me.setup();

        setdefines();
        topologybuff = undefined; // defer me.reset topology();
        for (let p = 1; p < numInstances; p++) me.addspring(p, p-1, 1,3,0);
        // impose pinchpoint 1/4 to 3/4, particle integer# a,b
        me.addspring(numInstances*1/4, numInstances*3/4);
        // me.setfix(numInstances*0.3, 0.5, 0.5, 0.5);

    // jump to help break out of straight line
        me.setfix(numInstances*0.25, 3.5, 3.5, 4.5);
        setTimeout(function() {me.removefix(numInstances*0.25);}, 1000);

    // and restart
        // springUniforms.stepsSoFar.value = 0;
        me.loadopen();
        setTimeout(me.start, 500);


    };

    /** convert integer particle number to 0..1 number (helper for topologyarr updates) */
    function parti2p(ai) {
        // ai may be non-integer
        return (ai+0.5) / numInstancesP2;
    }

    /** convert 0..1 particle number to integer */
    function partp2i(ai) {
        //  return numInstancesP2 * ai - 0.5;   // can be wrong when numInstancesP2 is not a power of 2
        return Math.round(numInstancesP2 * ai * 64) / 64 - 0.5;
    }

    /** find start offset for a particle (helper for topologyarr updates) */
    function startslot(ai) {
        // since three.js v74 texture is read other way up
    // not quite sure why ......
        return (Math.round(ai))*PARTSTEP;
    }

    const tarr = new Float32Array(4); // temp working array

    me.highestSlotUsed = 0;

    /**
    // set a free slot for a spring from a;
    // return spring number if set, undefined if not
    // allow just single spring from ai to bi for each type
    **/
    function setslot(ai, bi, len = 1, str = 1, pow = 0, type = DEFTYPE ) {
        let s = startslot(ai);
        if (s < 0 || s > topologyarr.length-1) {
            console.error("incorrect slot for spring " + ai + " " + bi);
            me.notcreated.push([ai, bi]);
            return undefined;
        }
        let bp = parti2p(bi) + type;
        for (let i=SPSTART; i< me.SPEND; i++) {
            if (topologyarr[s] === NOSPRING || topologyarr[s] === bp) {
                setat(s, bp, len, str, pow);
                if (i > me.highestSlotUsed) me.highestSlotUsed = i;
                return i;
            }
            s += DEFWIDTH;
        }
        me.notcreated.push([ai, bi]);
        return undefined;
    }
    me.setslot = setslot;

    /** show spring pairs for particle ai,
     * if f function apply to result, if 0, false etc return raw structure, else apply format  */
    me.pairsfor = function pairsfor(ai, f=1, show = true, showSpecial = true) {
        if (typeof f === 'number' && f > 1 ) {
            const r = [];
            for (let i = 0; i < f; i++) {
                const x = me.pairsfor(ai+i, 1, show, showSpecial)
                if (show) log(ai+i, '\n', x);
                r.push(x);
            }
            return r;
        }
        let pairs = [];
        let s = startslot(ai);
        for (let i=SPSTART; i< me.SPEND; i++) {
            if (topologyarr[s] !== NOSPRING) {
                const o = topologyarr[s];
                pairs.push({
                    bi: partp2i(o%1), role: Math.floor(o),
                    len: topologyarr[s+1], str: topologyarr[s+2], pow: topologyarr[s+3]
                });
            }
            s += DEFWIDTH;
        }
        if (showSpecial) {
            let rod = topologyarr[s]; if (rod !== NOSPRING) pairs.push('rod->' + partp2i(topologyarr[s]) + ':<' + (topologyarr[s+3] >= 0 ? format(topologyarr[s+3]) : 'XXX ') + '> ' + format(topologyarr[s+1]) + '..' + format(topologyarr[s+2]));
            s += DEFWIDTH;
            let fix = topologyarr[s]; if (fix !== NOSPRING) pairs.push( 'fix=' + topologyarr[s+1] +','+ topologyarr[s+2] +','+  topologyarr[s+3]);
            s += DEFWIDTH;
            let pull = topologyarr[s+3]; if (pull !== NOSPRING) pairs.push( 'pull=<' + topologyarr[s] +','+ topologyarr[s+1] +','+ topologyarr[s+2] +'>,'+  topologyarr[s+3]);
            s += DEFWIDTH;
            for (let i = 0; i < this.NUMSPECIALS-3; i++) {
                let ss = topologyarr[s]; if (ss !== NOSPRING)pairs.push( 'special' +i+ '=<' + topologyarr[s] +','+ topologyarr[s+1] +','+ topologyarr[s+2] +','+  topologyarr[s+3]+'>');
                s += DEFWIDTH;
            }
        }
        if (typeof f === 'function') pairs = f(pairs);
        return pairs;
    }


    /** free slot for a spring from a to b; */
    function dropslot(ai, bi, type = DEFTYPE) {
        let s = findslot(ai, bi, type);
        if (s !== NOSPRING) {
            setat(s, NOSPRING,NOSPRING,NOSPRING,NOSPRING);
            return true;
        } else {
            //  console.log("No springs found ", ai, bi);
            return false;
        }
    }
    me.dropslot = dropslot;

    /** find slot number for ai to bi */
    function findslot(ai, bi, type = DEFTYPE) {
        let s = startslot(ai);
        let bp = parti2p(bi) + type;
        for (let i = SPSTART; i < me.SPEND; i++) {
            if (topologyarr[s] === bp)
                return s;
            s += DEFWIDTH;
        }
        return NOSPRING;
    }
    me.findslot = findslot;

    /** find what springs we have between a and b */
    me.showspring = function (ai, bi, type) {
        if (type === undefined) {
            const a = [];
            for (let i=0; i < ROLEFORCESLENGTH; i++)
                a.push(me.showspring(ai, bi, i));
            return a;
        }
        const s = me.findslot(ai, bi, type);
        if (s < 0) return undefined;
        return {
            other: topologyarr[s], otheri: topologyarr[s]*numInstancesP2-0.5,
            len: topologyarr[s+1],
            str: topologyarr[s+2],
            pow: topologyarr[s+3]
        }
    };


    /** add a spring between particles ai and bi (integers 0..PATICLES-1), if there is space for it */
    me.addspring = function saddspring(ai,bi, len=1, str=1, pow=0, type = DEFTYPE) {
        let bad = 0;
        bad += setslot(ai,bi, len, str, pow, type) === undefined ? 1 : 0;
        if (bad) return bad;
        bad += setslot(bi,ai, len, str, pow, type) === undefined ? 1 : 0;
        if (bad) {
            dropslot(ai,bi);
            meX.badsprings++;
        } else {
            meX.goodsprings++;
        }
        return bad;
    };
    /** remove a spring between particles ai and bi (integers 0..PATICLES-1) */
    me.removespring = function sremovespring(ai,bi, type) {
        dropslot(ai,bi, type);
        dropslot(bi,ai, type);
    };

    /** remove a spring between particles ai and bi, signature to match addsparing */
    me.removespringF = function saddspring(ai,bi, len=1, str=1, pow=0, type = DEFTYPE) {
        me.removespring(ai, bi, type);
    }

    /** remove all springs from one or more particles: does NOT remove opposite pairs */
    me.removeAllSprings = function sremovespring(ai, n=1) {
        topologyarr.fill(NOSPRING, ai * PARTSTEP, (ai+n) * PARTSTEP);
    }


    /** set a rod enforcing distance of ai to bi */
    me.addrod = function springaddrod(ai, bi, min = 1, max=min) {
        addat(RODPOS, ai, bi, min, max, 1, true);
    };

    me.getrod = function springgetrod(ai) {return getat(RODPOS, ai); }

    /** enable (or disable) rod or rods, or damp them (set in range 1 undamped to 0 no effect) */
    me.rodspeed = function springrodspeed(ai, set=true, n=1) {
        if (set === true) set = 1;
        if (set === false) set = -1;
        for (let i=0; i<n; i++) {
            let s = startslot(ai+i) + RODPOS*DEFWIDTH;
            topologyarr[s + 3] = set;
        }
        topologybuff.needsUpdate = true;
    }

    /** remove rod from ai */
    me.removerod = function springremoverod(ai, n=1) {
        for (let i=0; i<n; i++)
            removeat(RODPOS, ai+i);
    };

    /** set a pull of ai to point x,y,z */
    me.addpull = function springaddpull(ai, x,y,z,force = 1) {
        if (x.x !== undefined) ({x,y,z} = x);
        // addat(PULLPOS, ai, x, y, z, force, true);
        let s = startslot(ai) + PULLPOS*DEFWIDTH;
        setat(s, x, y, z, force);
    };

    /** set an extra special spring ai */
    me.addspecial = function springaddspecial(ai, K, x,y,z,w) {
        if (x.x !== undefined) ({x,y,z} = x);
        let s = startslot(ai) + (SPECIALPOS+K)*DEFWIDTH;
        setat(s, x, y, z, w);
    };

    /** remove special K from ai */
    me.removespecial = function springremoverspecial(ai, K, n=1) {
        for (let i=0; i<n; i++)
            removeat(SPECIALPOS+K, ai+i);
    };



    /** get fixed position of particle ai (if any), return vector or undefined */
    me.getpull = function springgetpull(ai) {
        const r = getat(PULLPOS, ai);
        if (r[0] === NOSPRING) return undefined;
        return {pos: new THREE.Vector3(r[0], r[1], r[2]), force: r[3]};
    };

    /** remove pull from ai */
    me.removepull = function springremovepull(ai) {
        removeat(PULLPOS, ai);
    };

    /** set a fix enforcing position of ai */
    me.setfix = function springsetfix(ai, x = 0, y = 0, z = 0) {
        if (x.x !== undefined) ({x,y,z} = x);  // allow vector input
        else if (Array.isArray(x)) [x,y,z] = x;  // allow vector input
        // NOTE fix has x,y,z in t,z,w slots
        addat(FIXPOS, ai, 1, x,y,z);
    };

    /** set a fix enforcing position of ai, damped (d=0 undamped, d=1 just uses old) */
    me.setfixdamp = function springsetfixdamp(ai, d, x = 0, y = 0, z = 0) {
        if (x.x !== undefined) ({x,y,z} = x);  // allow vector input
        else if (Array.isArray(x)) [x,y,z] = x;  // allow vector input

        const ov = me.getfix(ai);
        if (ov === undefined || ov.x > 998 || x > 998) {
            addat(FIXPOS, ai, 1, x,y,z);
            // NOTE fix has x,y,z in t,z,w slots
        } else {
            const d1 = 1-d;
            addat(FIXPOS, ai, 1, d1*x + d*ov.x, d1*y + d*ov.y, d1*z + d*ov.z);
        }
    };

    me._permset = {};

    /** set a permament fix (reinstated after finishfix)*/
    me.setPermfix = function(ai, ...pos) {
        me._permset[ai] = pos;
        me.setfix(ai, ...pos);
    }

    /** remove a permament fix (reinstated after finishfix)*/
    me.removePermfix = function(ai) {
        if (ai === undefined) {
            for (const i of me._permset) me.removePermfix(i);
            return;
        }
        delete me._permset[ai];
        me.removefix(ai);
    }


    /** replace all pulls with fixes */
    me.pullsToFix = function(n = numInstances, unusedunfix = true, mat) {
        for (let ai = 0; ai < n; ai++) {
            const pull = me.getpull(ai);
            if (pull) {
                    me.setfix(ai, mat ? pull.pos.applyMatrix4(mat) : pull.pos);
            }
        }
        if (unusedunfix) me.finishFix(n);
    }

    /** get fixed position of particle ai (if any), return vector or undefined */
    me.getfix = function(ai) {
        const r = getat(FIXPOS, ai);
        if (r[0] === NOSPRING) return undefined;
        return new THREE.Vector3(r[1], r[2], r[3]);
    };
    /** get fixed positions within a range; return as object as an array would be very sparse */
    me.getfixr = function(si = 0, ei = numInstances) {
        const r = {}
        for (let i = si; i < ei; i++) {
            const s = me.getfix(i);
            if (s) r[i] = s;
        }
        return r;
    }


    /** query if particle is fexed */
    me.hasfix = function(ai) {
        const r = getat(FIXPOS, ai);
        return (r[0] !== NOSPRING);
    };

    /** remove fix from ai */
    me.removefix = function(ai) {
        removeat(FIXPOS, ai);
    };

    /** set the spring at position s with values a,b,c,d, do not trigger unnecessary updates */
    function setat(s,a,b,c,d) {
        tarr.set([a,b,c,d]);  // operate via float32array tarr to make sure of correct float comparisons
        // avoid unnecessary update
        if (topologyarr[s] === tarr[0] &&
            topologyarr[s + 1] === tarr[1] &&
            topologyarr[s + 2] === tarr[2] &&
            topologyarr[s + 3] === tarr[3])
        return;

        if (s < 0 || s > topologyarr.length - 1) {
            log('attempt to set spring out of range');
        } else {
            topologyarr.set(tarr, s);
            //PJT: DataTexture has an onUpdate property
            //could use indirectly for event callback?
            //although, maybe contactbuff is what I really need, and that isn't even mentioned in this file
            topologybuff.needsUpdate = true;
        }
    }

    /** get the spring values at position s */
    function _getat(s) {
        return topologyarr.slice(s, s+4);
    }

    /**get spring  */
    function getat(pos, ai, bi) {
        if (!topologybuff) me.resettopology();
        let s = startslot(ai) + pos*DEFWIDTH;
        if (s < 0 || s > topologyarr.length-1) {
            log("getat incorrect rod " + ai);
            return;
        }
        return _getat(s);
        // ?? should we return a more structured value?
        // ?? let bp = parti2p(bi);
    }


    /** helper.  add  a spring field at position pos within the spring (eg for rod) */
    function addat(pos, ai, bi, y = -1, z = -1, w = -1, warn = false) {
        if (!topologybuff) me.resettopology();
        let s = startslot(ai) + pos*DEFWIDTH;
        if (s < 0 || s > topologyarr.length-1) {
            log("addat incorrect rod " + ai);
            return;
        }
        let bp = parti2p(bi);
        // if (warn && topologyarr[s] > 0) log("rod about to be overridden from ", ai);

        setat(s, bp, y, z, w);
    }

    /** helper.  remove a spring field at position pos within the spring (eg for rod) */
    function removeat(pos, ai) {
        let s = startslot(ai) + pos*DEFWIDTH;
        setat(s, NOSPRING,NOSPRING,NOSPRING,NOSPRING);
    }

    /** set some shderdefs for spring demo */
    function setdefines() {
        // now in hornmaker
        //shaderdef("histpost(p,t)", "texture2D(posHist, vec2(histtime - (t), (p)))"); // particle position t units ago

        //shaderdef("histpos(p)", "texture2D(posNewvals, vec2(0, (p)))"); // particle position now

        return;
    }

    let fback, fsheet, fboth;   // functions that may be overwritten

    /** set up demo display using backbone (tranrule fback) */
    me.back = function() {
        setdefines();
        changeMat(fback, false);
        newmain();
    };

    /** set up demo display using sheet (tranrule fsheet) */
    me.sheet = function() {
        setdefines();
        changeMat(fsheet, false);
        setval("NORMTYPE", 1);
        newmain();
    };

    /** set up demo display using backbone and sheet (tranrule fboth) */
    me.both = function() {
        setdefines();
        changeMat(fboth, false);
        setval("NORMTYPE", 1);
        newmain();
    };

    /** tranrule for backbone ~ saved as function to help syntax verification */
    // if to reuse, clarify numInstances and numInstancesP2
    fback = function() {  // from springs .js for backbone only
horn("back").ribs(2000).radius(0.3)
.code("vec4 pp = histpos(back_rp * 0.8 + 0.1 ); x += pp.x; y += pp.y; z += pp.z;")
.xcode("vec4 pp =vec4(back_rp * 100, 0, 0, 0.); x += pp.x; y += pp.y; z += pp.z;")
.xcode("xcol = vec4( back_rp, 1.-back_rp, 0.5, 0.) * (fract(back_rp*PARTICLES+0.55)<0.1 ? 5. : 1.);")   // broken with separate pipe passes
.xcode("r *= (fract(back_rp*PARTICLES+0.6)<0.2 ? 1. : 0.1);")
;
let mainhorn="back";
    };


    // tranrule for sheet ~ saved as function to help syntax verification
    fsheet = function() {
// from springs .js for sheet only
ugene("histwidth", 0.9, 0, 1, 0.1, 0.01, "width of history to show", "springs");
ugene("histoffset", 0, -1, 1, 0.1, 0.01, "offset of history to show", "springs");

horn("sheet").ribs(2000).radius(0.000001)
.code("vec4 pp = histpost(rawp.y*histwidth + histoffset, sheet_rp); x = pp.x; y = pp.y; z = pp.z;")  //   // broken with separate skeleton and 'y-circle' horn logic
.xcode("xcol = vec4( sheet_rp, 1.-sheet_rp, 0.5, 0.) * (fract(sheet_rp*PARTICLES+0.55)<0.1 ? 5. : 1.); r=0.0;")
.xcode("xcol.w = fract((1.+histtime)*0.5 + rawp.y) < 0.7 ? -99. : 1.")
;
let mainhorn="sheet";
    };

    // tranrule for combination ~ saved as function to help syntax verification
fboth = function() {  // from springs .js for backbone and sheet
ugene("histwidth", 0.9, 0, 1, 0.1, 0.01, "width of history to show", "springs");
ugene("histoffset", 0, -1, 1, 0.1, 0.01, "offset of history to show", "springs");

// from springs .js for backbone and sheet
ugene("histwidth", 0.9, 0, 1, 0.1, 0.01, "width of history to show", "springs");
ugene("histoffset", 0, -1, 1, 0.1, 0.01, "offset of history to show", "springs");

horn("back").ribs(256).radius(1)
.code("vec4 pp = histpos(back_rp); x += pp.x; y += pp.y; z += pp.z;")
;
horn('holder').ribs(256).sub('sheet');
horn("sheet").ribs(2000).radius(0.05)
.code("x=y=z=0.; vec4 pp = histpost(SUBP_rp, rp*histwidth + histoffset); x = pp.x; y = pp.y; z = pp.z;")
;
horn("both").ribs(2).radius(0.000001).tail("back").tail('holder');
let mainhorn="both";

meX.setHISTLEN(256); meX.repos(); meX.demotopology(); setTimeout(meX.start, 500);

    };

    /** set up a demo making sure colours etc work in convenient way */
    me.demo = function(numparticles) {
        kinect.standardOff();
        setval("red1", 1);    //  next three 0 if we want to use xcol works better
        setval("green1", 1);
        setval("blue1", 1);
        setval("texscale", 0);
        setval("band1", 99);
        setval("band2", 0);
        setval("band3", 0);
        addgeneperm("histwidth", 0.9, 0,1);
        trysetele('doAutorot', 'checked', 1);
        trysetele('doAnim', 'checked', 0);
        setTimeout(resetMat, 200);
        posWorkhist = undefined;
        me.material = undefined;
        me.setup();
        //me.step();
        me.demotopology(numparticles);
        me.back();
        me.start();
        usemask=1; // << TODO check why and fix
        setInput(W.genefilter, 'spr | rad');
        parms.stepsPerStep = 50;
        // springUniforms.stepsSoFar.value = 0;  // will force reinit of positions          // TODO to remove Oct 2020
        me.loadopen();
        springUniforms.pushapartforce.value = 0.00001;

    };

    /** perform steps for a single frame */
    me.framesteps = function springsframesteps() {
        if (parms) me.step(parms.stepsPerStep);
    }

    /** start spring simulation on each frame */
    me.start = function(onop = 'preframe') {
        me.se = Maestro.onUnique(onop, me.framesteps);
        me.running = onop;
    };

    /** stop spring simulation on each frame */
    me.stop = function() {
        Maestro.remove(me.running, me.framesteps);
        me.se = undefined;
        me.running = false;
    };

    Object.defineProperty(me, 'isRunning', {
        get: () => !!me.running,
        set: v => {if (v) me.start(); else me.stop();}
    });

    /** perform s steps and show results (mainly for debug) */
    me.stepshow = function(s) {
        s = s || 1;
        badshader = false;
        me.step(s);
        newmain();
    };

    /** force reinitialization of positions */
    me.repos = function() {
        badshader = false;
        springUniforms.stepsSoFar.value = 0;  // will force reinit of positions // TODO to remove Oct 2020
        me.loadopen();
        me.step(1);
        newmain();
        meX.settleHistory();
        workhisttime = 0.5/WORKHISTLEN;
        histtime = 0.5/HISTLEN;
    };

    // save current xyzs to fid (unless not given), return string
    me.save = function(fid, start = 0 , step = 1, len = numInstances ) {
        let d = readWebGlFloat(posNewvals, {mask: 'xyz'});
        let s = [];
        for (let i=0; i < len; i++) {
            s.push( [start + step * i, d[0][i].toFixed(3), d[1][i].toFixed(3), d[2][i].toFixed(3)].join('\t') );
        }
        let r =  s.join('\n') + '\n'
        if (fid) writetextremote(fid, r);
        return r;
    }

    //consider how the time this function takes relates to state of graphics pipeline:
    //converting buffers on GPU in readWebGlFloat
    //reading back the result later (beginning of subsequent frame)
    // n can be an array of Vector3s which will be populated
    me.getpos = function springsgetpos(n = numInstances) {
        let tarray;
        if (Array.isArray(n)) { tarray = n; n = tarray.length; }
        if (n === true) n = numInstancesP2;
        const sid = 'springsgetpos' + id;
        if (!posNewvals) return [];
        const d = readWebGlFloatDirect(posNewvals, {channels: 4}, sid);
        let s = [];
        if (tarray) {
            for (let i=0; i < n; i++) {
                const i3 = 4*i;
                const v = tarray[i];
                v.x = d[i3]; v.y = d[i3 + 1]; v.z = d[i3 + 2];  // using constructor fails for NaN
            }
            return tarray;
        } else {
            for (let i=0; i < n; i++) {
                const i3 = 4*i;
                const v = new THREE.Vector3();
                v.x = d[i3]; v.y = d[i3 + 1]; v.z = d[i3 + 2];  // using constructor fails for NaN
                s.push(v);
            }
        }
        return s;
    }

    /** goto saved array of spring positions */
    me.setpos = function(pos, step=4) {
        if (pos instanceof Float32Array ) {
            for (let i = 0; i < pos.length/step; i++)
                me.setfix(i, pos[i*step], pos[i*step+1], pos[i*step+2]);
        } else {
            step = 1;
            for (let i = 0; i < pos.length; i++)
                me.setfix(i, pos[i]);
        }
        me.finishFix(pos.length/step);
    }

    me.getWorkHist = function(all = false) {
        let d = readWebGlFloat(posWorkhist, {mask: 'xyz'});
        let rows = [];
        for (let j=0; j<WORKHISTLEN; j++) {
            let s = [];
            rows.push(s);
            for (let i=0; i < (all ? numInstancesP2 : numInstances); i++) {
                // let i2 = i + j*WORKHISTLEN;
                let i2 = i*WORKHISTLEN + j;
                s.push( new THREE.Vector3( d[0][i2], d[1][i2], d[2][i2]));
            }
        }
        return rows;
    }

    /** go to given particle (number)
    If not given, centre on aletage of selections
    If not given, centre on centre.
    **/
    me.gotoParticle = function(n) {
        let pos = new THREE.Vector3();
        const poss = me.getpos();  // all positions
        if (n === undefined) {
            const p = pick.array;
            let nn = 0;
            for (let i=0; i < 15; i++) {
                if (!(i===0 || i===4 || i===5 || i===8 || i===12 || i===13 ) ) continue;
                if (p[i] < 998) {
                    pos.add(poss[Math.round(p[i] * numInstances)]);
                    nn++;
                }
            }
            if (nn)
                pos.multiplyScalar(1/nn);
            else
                pos = poss[Math.round(numInstances / 2)];
        } else {
            pos = poss[Math.round(n)];
        }
        if (!pos) { msgfixerror('cannot pick particle', n); return; }
        // assuming GPUSCALE, NOSCALE but CENTRE
        // pos * scaleFactor - scaleDampTarget * rot4rot + rot4pan = (0,0,0)
        // so we set rot4pan = - pos * scaleFactor - scaleDampTarget * rot4rot

        // extract scaleDampTarget (used to centre object)
        const dt = readWebGlFloat(scaleDampTarget1.main);
        const tv = new THREE.Vector3(-dt[0][0], -dt[1][0], -dt[2][0]);

        // get rot4 clone and maniplate as we need it to get just rotation
        // we could probably corrupt uniforms.rot4.value itself, but safer this way
        const rot = springUniforms.rot4.value.clone();
        const e = rot.elements;
        e[3] = e[7] = e[11] = 0;
        rot.transpose();

        // compute the values
        // and set the negative
        pos.multiplyScalar(G.scaleFactor).add(tv).applyMatrix4(rot);
        G._rot4_ele[3] = -pos.x;
        G._rot4_ele[7] = -pos.y;
        G._rot4_ele[11] = -pos.z;
    }

    /** make the fixed springs take efffect and then remove them */
    me.finishFix = function(n = numInstances) {
        me.step(1);
        me.settleHistory();
        // remove all the fixes
        for(let i=0; i<n; i++)
            me.removefix(i)
        // but reestablish the permament ones
        for (const i in me._permset) me.setfix(i, me._permset[i]);
    }

    /** recentre all spring positions,  also settles and so kills inertia
     * allow for situation where some (all) particles are fixed ... the fixed points will also be moved
     * eg for .xys files used as fixed positions
     */
    me.reCentre = function() {
        me.transformPositions(undefined, true, false);
    }

     /** rotate all spring positions,  also settles and so kills inertia
     * allow for situation where some (all) particles are fixed ... the fixed points will also be moved
     * eg for .xys files used as fixed positions
     */
    me.rotatePositions = function(m = EX.randrot()) {
        me.transformPositions(v => v.clone().applyMatrix4(m), true, true);
    }

    /** apply transform to all particles
    */
    me.applyTransform = function({num = undefined, clearTransform = true} = {}) {
        // if (mat.length === 16) {mat = tmat4; mat.elements = G._rot4_ele.slice();}
        // if (mat.length === 16) mat = tmat4.set(...G._rot4_ele);
        // const sc = G._uScale
        // if (sc !== 1) mat = mat.clone().premultiply(tmat4.makeScale(sc, sc, sc));
        // me.transformPositions(v => v.clone().applyMatrix4(mat), false, false, num);

        // as long as rot4uniforms() has been applied, U.rot4 allows for rot4_ele, uScale, tad.centre, ...
        const mat2 = tmat4.copy(U.rot4).transpose();
        me.transformPositions(v => v.clone().applyMatrix4(mat2), false, false, num);
        if (clearTransform) {
            G._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            G._uScale = 1
        }
    }

    /** transform all positions by function f, optionally centre before f, and move back after f */
    me.transformPositions = function springs_transformPositions (f, precen = true, postcen = true, num) {
        const ppp = me.getpos();
        const ccc = CSynth.stats(ppp).centroid;
        const wasfix = new Uint8Array(ppp.length);  // no boolarray
        ppp.forEach( (v,i) => {
            wasfix[i] = me.hasfix(i);
            v = v.clone();
            if (precen) v = v.sub(ccc);
            if (f) v = f(v);
            if (postcen) v = v.add(ccc);
            me.setfix(i, v);
        });
        me.step(1);
        me.settleHistory();
        ppp.forEach( (v,i) => { if (!wasfix[i]) me.removefix(i); });
    }

    /** reserve a (set) of particles, return number for first in set */
    me.reserve = function(name, num = 1) {
        let presn = me._reserved[name];
        if (!presn) {
            if (me.nextFree === -999) me.nextFree = me.numInstances;
            presn = me._reserved[name] = [me.nextFree, num];
            me.nextFree += num;
            if (me.nextFree > me.numInstancesP2)
                serious('attempt to use too many reserved springs', me.nextFree, me.numInstancesP2);
        }
        const [p, resn] = presn;
        if (num > resn)
            serious('attempt to use reserved spring out of range', name, num, resn);
        return p;
    }
    me._reserved = {};
    me.nextFree = -999;

    me.torsiontest = function () {
        const n = 8;
        meX.setPARTICLES(n);

        springdemo( {
            redcontacts: {num: n, low: 0, step: 1},
            whitecontacts: {num: n, low: 0, step: 1}
        });
        meX.setMAX_DEFS_PER_PARTICLE(n);
        meX.setup();
        meX.resettopology();

        meX.addspring(0,1,1);
        meX.addspring(1,2,1);
        meX.addspring(2,3,1);
        meX.addspring(0,2,1.4);
        meX.addspring(1,3,1.4);
        meX.setfix(0, 5,0,0);

        meX.setfix(4, -1,0,1);
        meX.setfix(5,  0,0,1);
        meX.setfix(6,  0,0,0);
        meX.addspring(6,7,1);
        meX.addspring(5,7,1.414);
//        springs .addspring(5,6,1);
//        springs .addspring(6,7,1);
//        springs .addspring(4,5,1);
        //XXX: global/singleton-ish: (not thought to matter right now, but flag...)
        if (me.id) console.warn(`${me.id}.torsiontest() may be liable to cause problems.`);
        Maestro.remove('preframe', W.DNASprings.dostretch);
        G.pushapartforce = 0;
        G._camz = 200;
        vivepick = pick = nop;
        nomess(false);
//        setInput(NOSCALE, true); setInput(NOCENTRE, true);
        msgfix();
        guifilter.value = 'torsion';
    }

    /** generate a helix, step is in number of particles, pitch is in backbone units, rad is radius in backbone units */
    me.helix = function springhelix({step = 10, pitch = 2, rad, start = 0, end = me.numInstances, strength = 0.1} = {}) {
        if (rad === undefined) rad = step / (Math.PI * 2);  // ignore pitch
        for (let d = 2; d <= step; d++) {
            const rel = d / step;
            const x = pitch * rel;
            const ang = Math.PI *2 * rel;
            const y = rad * Math.cos(ang);
            const z = rad * Math.sin(ang);
            const len = Math.sqrt((x**2 + (y-rad)**2, z**2));
            for (let i = start+d; i < end; i++) {
                me.addspring(i, i-d, len, strength/step);
            }
        }
    }

    /** generate a helix like the old one from spring shader code itself  */
    me.loadopen = function({sc = 1, len = 1} = {}) {
        // if (isNaN(sc)) sc = 1;
        const ssc = sc/5;
        for (let i = 0; i < numInstances; i++) {
            const a = 2 * Math.PI * i / numInstances;
            const pp = i/numInstances;
            me.setfix(i, (pp * 10.0 - 5.0) * len * ssc, -Math.sin(pp*31.42) * ssc, Math.cos(pp*31.42) * ssc);
        }
        me.finishFix();
    }

        // float pp = part / ACTIVERANGE;
        // // y -ve, 11/10/18, helps rsse fold with extrusion part on top ... arbitrary otherwise
        // // also makes helix righthanded
        // mypos = vec3(pp * 10.0 - 5.0, -sin(pp*31.42), cos(pp*31.42) ) * springlen /31.42 * VnumInstances;


    me.mutate = async function(w = 2000, use=undefined) {
        if (vps[0] + vps[1] === 0) setViewports([3,3]);
        if (use) for (let gn in genedefs) {genedefs[gn].free = +use.includes(gn)}
        slowMutate = false;
        mutate();
        if (me.prerenderObjk) Maestro.remove('prerenderObj', me.prerenderObjk)
        Maestro.on('prerenderObj', (evt,a,b,c) => {
            const dispobj = evt.dispobj;
            // log('prerenderObj', dispobj.vn, dispobj.springs)
            if (dispobj.springs)
                meX.setpos(dispobj.springs)
            // const vn = dispobj.vn;
            // CSynth.gotoCapture(vn);
            // slots[vn].dispobj.genes = currentGenes;
        });


        for (const slot of slots) {
            if (slot === undefined) continue;
            const dispobj = slot.dispobj;
            // ?? setObjUniforms(dispobj.genes, uniforms);
            // ?? initial position here ??
            me.step(w);
            dispobj.springs = me.getpos();
            dispobj.render(1);
            console.log('ready', dispobj.vn);
            await S.frame();
        }
    }

    /** find the max number of springs from any particle, and which particle */
    me.maxsprings = () => new Array(numInstances).fill(0).reduce((c,v,i) => {let j = me.pairsfor(i).length; return j > c[1] ? [i,j] : c}, [0,0])

    /** find the max number of springs from any particle, and which particle */
    me.numPerRole = () => {
        const a = new Array(ROLEFORCESLENGTH).fill(0);
        for (let p = 0; p < numInstances; p++) {
            const pp = me.pairsfor(p);
            for (const pair of pp) {
                a[pair.role]++;
            }
        }
        return a;
    }

    me.time = async function(n = 1000, logint = 0) {
        msgfixlog('springtime', 'working ...', n);
        await S.frame();
        await S.frame();
        const st = performance.now();
        me.step(n, logint);
        const et1 = performance.now();
        gl.flush();
        const et2 = performance.now();
        gl.finish();
        const et3 = performance.now();
        readWebGlFloatDirect(posNewvals, {channels: 4});
        const et4 = performance.now();
        const dt = performance.now()-st;
        msgfixlog('springtime', `${Math.round(dt)}ms for ${n}, each ${Math.round(dt*1000/n)}μsec`);
        log('call', Math.round(et1-st), 'flush', Math.round(et2-et1), 'finish', Math.round(et3-et2), 'read', Math.round(et4-et3));
    }

    /** repair any NaN spring positions, either random, or from s if given */
    me.repair = function(s) {
        // const p = me.getpos();
        const rawp = readWebGlFloatDirect(springs.posNewvals);
        let n = 0;
        for (let i = 0; i < rawp.length; i+=4)
            if (isNaN(rawp[i])) {
                if (s && s[i] !== undefined)
                    springs.setfix(i/4, s.subarray(i, i+3));
                else
                    springs.setfix(i/4, randvec3());
                n++;
            }
        springs.finishFix();
        log('spring repaired: ', n);
        return n;
    }

    /** add a line of springs */
    me.addline = function(si, sj, ei, ej, len, str, pow, type) {
        const di = ei - si, dj = ej - sj;
        if (di > dj)
            for (let i = si; i <= ei; i++)
                me.addspring(i, Math.round(sj + (i-si) * dj/di), len, str, pow, type);
        else
            for (let j = sj; j <= ej; j++)
                me.addspring(Math.round(si + (j-sj) * di/dj), j, len, str, pow, type);
    }

    /** add a line of springs at fixed distance d, from start (s, s+d) to end (e-s, e) */
    me.addDistline = function(s, e, d, len, str, pow, type) {
        for (let i = s; i <= e-d; i++)
            me.addspring(i, i+d, len, str, pow, type);
    }

    me.perturbPos = function(k = G.perturbScale) {
        const pp = me.getpos();
        for (let i = 0; i < me.numInstances; i++)
            me.setfix(i, pp[i].add(randvec3(k)));
        springs.finishFix()
    }

    return this;
};

Springs.prototype.toString = function() { return '[Springs ' + this.id + "]" };
springs = new Springs();

// for debug ...
function spring_stepshow(s) { springs .stepshow(s); }
function springnew() { springs .repos(); }

function checkMaterial(mat) {
    if (!checkMaterial.scene) {
        checkMaterial.scene = newscene('springcheckmaterial');
        checkMaterial.camera = new THREE.OrthographicCamera();
        checkMaterial.geom = new THREE.PlaneGeometry(1,1);
        checkMaterial.geom.frustumCulled = false;
        checkMaterial.mesh = new THREE.Mesh(checkMaterial.geom);
        checkMaterial.scene.addX(checkMaterial.mesh);
        checkMaterial.rt = WebGLRenderTarget(1,1, 'springs .checkmat');
    }
    checkMaterial.mesh.material = mat;
    renderer.render(checkMaterial.scene, checkMaterial.camera, checkMaterial.rt);
}

function springBufferGUI() {
    let g = V.DebugGui = dat.GUIVR.createX("debug");
    const n = ()=>{};
    //            uniforms.posWorkhist.value = posWorkhist.texture;
    //        uniforms.posHist.value = posHist.texture;
    //        uniforms.posNewvals.value = posNewvals.texture;


    g.addImageButton(n, uniforms.topologybuff.value, true);
    g.addImageButton(n, uniforms.posNewvals.value, true);
    g.addImageButton(n, uniforms.posWorkhist.value, true);
    g.addImageButton(n, uniforms.posHist.value, true);
    g.name = 'springBufferGUI';
    V.rawscene.add(g);

    g.scale.set(10,10,10);
}

/* almost no spring forces for debug */
function nospringforce() {
    for (const gn in W.FFG('force')) G[gn] = 0;
    U.roleforces.fill(0);
    U.roleforcesFix.fill(0);
    G.gravity = 0;
}

/* test of spring
gravity and inertia test. springmaxvel is the killer???
*/
function springtest({n=9, springforce=1, springmaxvel = 1e20} = {}) {
    let ly = 0, ls = 0;
    function ch(s) {
        springs.step(s);
        const v = readWebGlFloatDirect(springs.posNewvals)
        const dy = v[1]-ly;
        ly = v[1];
        const ss = springs.getStepsSoFar();
        const ds = ss - ls;
        ls = ss;
        log(U.workhisttime, 'steps', ds, 'dy', dy, 'll', 1 - (v[5]-ly), dy/ds)

    }
    springs.newmat();
    springs.setPARTICLES(2, 0);
    springs.resettopology();
    springs.setup();
    springs.stop();
    nospringforce();
    G.springforce = springforce;
    G.backboneStrength = 1;
    G.springrate = 1;
    G.springpow = 0;
    G.springmaxvel = springmaxvel;
    G.damp = -1;
    springs.uniforms = uniforms;
    setObjUniforms(G, uniforms);

    //  function saddspring(ai,bi, len=1, str=1, pow=0, type = DEFTYPE)
    springs.addspring(0, 1, 1);

    springs.setfix(0, 0,0,0);
    springs.setfix(1, 0,1,0);

    U.gravity = 0;
    springs.finishFix();
    ch(0);

    U.gravity = -1;
    ch(1);

    U.gravity = 0;
    for (let i = 0; i < n; i++) ch(1);
    ch(100);
    ch(1000);
    ch(10000);

}
