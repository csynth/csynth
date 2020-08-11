'use strict';

// declarations to prevent 'undeclared global' and work towards namespace cleanup
var THREE, renderer, horn, kinect, resetMat, Maestro, opmode, usemask, badshader, W,
serious, dat, setthresh, WebGLRenderTarget, rrender, newscene, getdata, substituteVirtualShaderCode, doInclude,
ColorKeywords, parseUniforms, log, changeMat, newmain, setval, ugene, trysetele, setInput, readWebGlFloat,
writetextremote, guiFromGene, ffloat, V, setspringshaders, springdemo, CSynth, G, vivepick, pick, nop,
nomess, msgfix, guifilter, DNASprings, msgfixerror, scaleDampTarget1, getSpringUniforms, addgeneperm, inworker,
genedefs, nextpow2, uniforms, GX, gl, onframe, maxTextureSize, EX, format, newTHREE_DataTextureNamed, framedelta;

var Springs = function(id = '') {
    //if (meX) serious("attempt to reset springs");
    var me = this;
    onframe(() => me.MAXPARTICLES = maxTextureSize);
    var meX = this; //refactoring to remove global 'springs' references.
    var posWorkhist, posNewvals, posHist;
    var MAX_DEFS_PER_PARTICLE; // = 8;              // total  number of definitions per particle, inclduing 'special' ones
    var DEFWIDTH = 4;                           // number of fields per entry, eg 4 for  otherid, len, strength, power
    var PARTSTEP; //  = MAX_DEFS_PER_PARTICLE * DEFWIDTH;  // step to move to next particle
    var SPSTART = 0;                            // start for 'specials'
    var NUMSPECIALS = me.NUMSPECIALS = 3;                        // numner of special springs for each particle
    var SPEND; // = MAX_DEFS_PER_PARTICLE - NUMSPECIALS;      // last regular, first special
    var RODPOS;                              // rod special
    var FIXPOS;                             // fixed special
    var PULLPOS;                             // pull to point special
    const WORKHISTLEN = 4;
    let HISTLEN = 64;
    var numInstances = 32;               // number of active particles
    var numInstancesP2 = numInstances;      // size of particle buffers, also space for 'extra' particles
    var EXTRASPACE = 16;                    // space for extra particles
    var old;                            // last details, for changing resolution of same model
    me.id = id;
    const ROLEFORCESLENGTH = me.ROLEFORCESLENGTH = 16;
    const DEFTYPE = ROLEFORCESLENGTH+1; // not too large or fractional part of type will be lost

    // me.setWORKHISTLEN = function(v) { WORKHISTLEN = v; posWorkhist = undefined; };
    me.setHISTLEN = function(v) { HISTLEN = v; posWorkhist = undefined; };
    me.getHISTLEN = function() { return HISTLEN; };
    me.setMAX_DEFS_PER_PARTICLE = function(v) {
        if (MAX_DEFS_PER_PARTICLE === v) return;
        MAX_DEFS_PER_PARTICLE = v;
        PARTSTEP = MAX_DEFS_PER_PARTICLE * DEFWIDTH;  // step to move to next particle
        SPEND = me.SPEND = MAX_DEFS_PER_PARTICLE - NUMSPECIALS;      // last regular, first special
        RODPOS = SPEND;                         // rod special
        FIXPOS = SPEND + 1;                     // fixed special
        PULLPOS = SPEND + 2;                    // pull to point special

        posWorkhist = undefined;
        if (me.newmat) me.newmat();
    }

    let springUniforms, parms;
    /** set up # particles, and return necessary particle array size numInstancesP2 */
    me.setPARTICLES = function(v, e = EXTRASPACE) {
        if (numInstances === v && EXTRASPACE === e) return;
        if (posWorkhist)
            old = {/** posw: posWorkhist, **/ posn: posNewvals, numInstances: me.numInstances, numInstancesP2: me.numInstancesP2};
        EXTRASPACE = e;
        meX.numInstances = numInstances = v;
        if (me === springs) window.numInstances = numInstances;
        meX.numInstancesP2 = numInstancesP2 = nextpow2(v + EXTRASPACE);
        if (numInstancesP2 > springs.MAXPARTICLES)
            serious('springSize', 'request springs numInstancesP2', numInstancesP2, 'exceeds max', springs.MAXPARTICLES);
        springUniforms.numInstances.value = numInstances;
        springUniforms.numInstancesP2.value = numInstancesP2;

        posWorkhist = undefined;
        me.newmat();
        return numInstancesP2;
    };

    var topologybuff;
    var mat;
    var workhisttime, histtime;  // local copy in case gene/uniform value overwritten, range 0..1
    var lasthisttime = 0;  // time (timer time) last history step saved
    if (getSpringUniforms) [springUniforms, parms] = getSpringUniforms(me); // but not in worker
    me.uniforms = springUniforms;
    me.parms = parms;
    me.getStepsSoFar = () => springUniforms.stepsSoFar.value;

    me.setMAX_DEFS_PER_PARTICLE(8);

    var geom, scene, line, camera, histCopyScene, geom1, mesh1, geomwcopy, material1;

    me.createGUIVR = function() {
        if (!CSynth) return;  // CSynth specific for now
        if (me.id) {
            log("TODO::: GUIVR for extra Spring sets...");
            return;
        }
        var gui = dat.GUIVR.createX("Simulation settings");
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
                        CSynth.alignModels('lor');
                        CSynth.alignForces('lor');
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


        var sgui = dat.GUIVR.createX("More ...");
        gui.addFolder(sgui);
        // gui.add(W, 'threshold', 0, 150).listen().name("Spring threshold").onChange(setthresh);
        CSynth.addSpringSourceGUI(sgui);
        guiFromGene(sgui, "stepsPerStep");
        guiFromGene(sgui, "damp");
        guiFromGene(sgui, "powBaseDist");
        guiFromGene(sgui, "minActive");
        guiFromGene(sgui, "maxActive");
        guiFromGene(sgui, "maxBackboneDist");
        guiFromGene(sgui, "noiseforce");
        guiFromGene(sgui, "backboneScale");

        sgui.add(DNASprings,  'stretch').listen();
        guiFromGene(sgui, "springspreaddist");

        const yy = { get boosting() {return !!CSynth.boostsprings.mid}, set boosting(v) { CSynth.boostsprings(v);} }
        sgui.add(yy, 'boosting').name('boost springs').listen()
            .setToolTip('boost springs by moving mouse over matrix\nset strengh and boostrad  below to tailor');

        const zz = { get strength() {return G.boostfac < 1 ? 0 : Math.log10(G.boostfac)}, set strength(v) { G.boostfac = v <= 0 ? 0 : Math.pow(v, 10);} }
        sgui.add(zz, 'strength',0, 10).step(0.1).name('strength').listen();
        guiFromGene(sgui, 'boostrad');

        return gui;
    }

    /** set up the various buffers, if not alrady correct
     */
    me.setup = function() {
        if (!mat) me.newmat();

        if (!posWorkhist || posWorkhist.width !== WORKHISTLEN || posWorkhist.height !== numInstancesP2
            || (posHist && (posHist.width !== HISTLEN || posHist.height !== numInstancesP2))
            || (posHist && meX.filter && meX.filter !== posHist.texture.minFilter)  // spring.filter may be set for debug purposes
            ) { // at start or after change
            me.newmat();

            // find best we can do for linear filter
            var linfilt = renderer.extensions.get('OES_texture_float_linear') ? THREE.LinearFilter : THREE.NearestFilter;
            // linfilt = THREE.NearestFilter;

            //XXX PJT: shouldn't we dispose() existing resources as well?

            if (HISTLEN !== 0) {
                posHist = WebGLRenderTarget(HISTLEN, numInstancesP2, {
                    minFilter: linfilt,
                    magFilter: linfilt,
                    wrapS: THREE.RepeatWrapping,
                    wrapT: THREE.ClampToEdgeWrapping,
                    format: THREE.RGBAFormat,
                    type: THREE.FloatType
                }, 'spring.posHist' );
                posHist.texture.generateMipmaps = false;
            } else {
                posHist = undefined;
            }
            me.posHist = posHist;  // for external debug

            posWorkhist = WebGLRenderTarget(WORKHISTLEN, numInstancesP2, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                wrapS: THREE.RepeatWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            }, 'spring.posWorkhist'  );
            posWorkhist.texture.generateMipmaps = false;
            me.posWorkhist = posWorkhist;  // debug


            posNewvals = WebGLRenderTarget(1, numInstancesP2, {
                minFilter: linfilt,
                magFilter: linfilt,
                wrapS: THREE.RepeatWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            }, 'spring.posNewvals'  );
            posNewvals.texture.generateMipmaps = false;
            me.posNewvals = posNewvals;  // for external debug

            me.clearall();
            springUniforms.posWorkhist.value = posWorkhist.texture;
            springUniforms.posHist.value = posHist && posHist.texture;
            springUniforms.posNewvals.value = posNewvals.texture;
            workhisttime = 0.5/WORKHISTLEN;
            histtime = 0.5/HISTLEN;
            springUniforms.stepsSoFar.value = 0;
            lasthisttime = -99999;
            springUniforms.WORKHISTLEN.value = WORKHISTLEN;
            springUniforms.HISTLEN.value = HISTLEN;
            me.resettopology();

            // TO CHECK, non power 2 numInstances (eg 132) gives odd result
            // also WORKHISTLEN > 256
            // scene etc for doing real spring work and saving result in posNewvals
            // input is complete posWorkhist, output is single workhisttime posNewvals
            scene = newscene('springsreal');
            geom = new THREE.Geometry();
            geom.vertices[0] = new THREE.Vector3(0, -1, 0);  // extra at each end, otherwise last particle gets marooned
            geom.vertices[1] = new THREE.Vector3(0, 2, 0);
            line = new THREE.Line(geom, mat);
            line.frustumCulled = false;
            scene.addX( line );
            camera = new THREE.OrthographicCamera( -1,1,1,-1, -1, 1 );
            camera.matrixAutoUpdate = false;

            // scene etc for copying posNewvals back to correct workhisttime slice of posWorkhist
            // needs a real mesh, textured line doesn't seem to work
            histCopyScene = newscene('springtoworkhist');
            material1 = new THREE.MeshBasicMaterial();
            material1.map = posNewvals.texture;
            material1.depthTest = false;
            material1.depthWrite = false;
            geom1 = new THREE.PlaneGeometry(2, 2 );
            mesh1 = new THREE.Mesh(geom1, material1);
            mesh1.frustumCulled = false;
            histCopyScene.add( mesh1 );
        }
    };
    // nb distbuff was inappropriately named xyzbuff.
    // The name xyzforce is still used though distforce would be more appropriate
    let distbuff;
    me.initdistbuff = function() {
        const n = numInstancesP2;
        const data = new Float32Array(3 * n*n);
        distbuff = newTHREE_DataTextureNamed('distbuff', data, n, n, THREE.RGBFormat, THREE.FloatType);
        distbuff.magFilter = distbuff.minFilter = THREE.NearestFilter;
        distbuff.needsUpdate = true;
        springUniforms.distbuff.value = distbuff;
        return distbuff;
    }
    me.setDistSpring = (x, y, length=1) => {
        if (x > numInstances || y > numInstances) return false;
        if (!distbuff) return false;
        const data = distbuff.image.data;
        const i = 3*(x + y*numInstancesP2);
        data[i] = length;
        distbuff.needsUpdate = true;
        return true;
    }

    me.postSpringStepFns = [];
    //was going to have this be more 'addEventListener' rather than single callback
    //actually, ATM only using for one thing, and accumulating listeners could be slightly bad.
    //I've now made annotation spring listener only work when annotation group is visible.
    me.onPostSpringStep = fn => me.postSpringStepFns.push(fn);

    /** perform stepsPerStep simulation steps
     * also perform (re)initialization if necessary
     * @returns {undefined}
     */

    let targsteps = 0, donesteps = 0;
    me.step = function(steps) {
        if (!me.id) parms = G; //keeping a ref to G isn't enough to ensure proper buffer swap
        if (steps === undefined || steps.maestro) steps = parms.stepsPerStep; // maestro detects unused maestro parameter
        me.setup();
        material1.map = posNewvals.texture;

        if (steps < 0) {
            targsteps -= framedelta * steps;
            steps = Math.round(targsteps - donesteps);
            donesteps +=  steps;
            if (steps > 500) targsteps = donesteps = 20;  // in case of hiccup
        }

        // if we have more than one instance of springs around, we need to disambiguate.
        // In fact there may be other ways in which Maestro in general should often be replaced with more normal EventEmitters...
        // In this instance, the 'prespringstep' is used precisely once, and 'postspringstep' never, so very easy to change...
        Maestro.trigger('prespringstep' + me.id);
        // now perform simulation steps
        var sopmode = opmode;  // save in case this is called during another operation, eg during setup
        opmode = "springs" + me.id;
        for (var i=0; i < steps; i++) {
            // perform simulation and render the result slice into posNewvals
            springUniforms.posWorkhist.value = posWorkhist.texture;
            //renderer.clearTarget(posNewvals);
            rrender("springstep"+me.id, scene, camera, posNewvals);  // camera ignored
            springUniforms.stepsSoFar.value++;

            // render posNewvals into new slice of posWorkhist
            saveworkhist();

            // if correct time, render posNewvals into histtime slice of posHist
            if (posHist) {
                var now = Date.now();
                while (now >= lasthisttime + 1000/parms.histStepsPerSec) {
                    if (springs.log) log("hist delta=", now-lasthisttime);
                    savehist();
                    lasthisttime += 1000/parms.histStepsPerSec;
                    if (now > lasthisttime + 250)
                        lasthisttime = now;  // got >250ms behind
                }
            }
        }
        opmode = sopmode;

//springshowpix();
//log(">>>>>>>>>>>>>>>>>>>>>>", uniforms.stepsSoFar.value);
        renderer.setRenderTarget();  // possibly avoid pollution, should be reset elsewhere as needed
        var s = new THREE.Vector2();
        s = renderer.getSize(s);
        renderer.context.flush(); // not sure why, but this stops extreme jitter, especially in ANGLEsprints

        newmain();  // ensure active springs keep display up to date
        //Maestro.trigger('postspringstep' + me.id);
        me.postSpringStepFns.forEach(f => f(me)); //actually, maybe I want to callback slightly earlier...
    };

    /** clear all springs XXX:: consider distbuff */
    me.clearall = function() {
        renderer.setClearColor(ColorKeywords.black);     //< use main viewport color for clearing the canvas
        if (posHist) renderer.clearTarget(posHist, true, true, true);
        renderer.clearTarget(posWorkhist, true, true, true);
        renderer.clearTarget(posNewvals, true, true, true);
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

        material1.map = posNewvals.texture;
        // make sure we just hit the correct slice
        mesh1.matrix.elements[0] = 1 / WORKHISTLEN;
        mesh1.matrix.elements[12] =  workhisttime * 2 - 1;
        mesh1.matrixWorld.copy(mesh1.matrix);

        rrender("springsaveworkhist", histCopyScene, camera, posWorkhist, false);
    }

    var mcscene, mcmat, mcgeom, mcmesh;
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
        // 0,1 y=1,  2,3 y=-1
        mcgeom.vertices[0].y = mcgeom.vertices[1].y = (me.numInstances/me.numInstancesP2 * 2 - 1);
        const fv = mcgeom.faceVertexUvs[0];
        fv[0][0].y = fv[0][2].y = fv[1][2].y = old.numInstances/old.numInstancesP2;

        mcgeom.uvsNeedUpdate = true;
        mcgeom.verticesNeedUpdate = true;

        rrender("mccopy", mcscene, camera, posWorkhist, false);

    }

    /** save current value into next frame of history */
    function savehist() {
        if (!posHist) return;
        // move 'current' history time on one slot in circular buffer
        histtime += 1/HISTLEN;
        if (histtime > 1) histtime -= 1;
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
        mesh1.matrix.elements[0] = 0.1 / HISTLEN;
        mesh1.matrix.elements[12] = histCopyScene.position.x = histtime * 2 - 1;
        mesh1.matrixWorld.copy(mesh1.matrix);
        rrender("springsavehist", histCopyScene, camera, posHist, false);
        var s = new THREE.Vector2();
        s = renderer.getSize(s);
        renderer.setRenderTarget(undefined);  // possibly avoid pollution, should be reset elsewhere as needed
    }

    /** force all history same as current frame */
    me.settleHistory = function() {
        if (!histCopyScene) me.setup();
        // avoid special helix initialization for small stepsSoFar,
        // we must have good values else we wouldn't want to settle them
        if (me.uniforms.stepsSoFar.value < 8) me.uniforms.stepsSoFar.value = 8;
        opmode = 'springs';
        for (let i=0; i<=HISTLEN; i++) {
            savehist();
        }
        for (let i=0; i<=WORKHISTLEN; i++) {
            saveworkhist();  // << TODO not sure why this not working
        }
    };

    /** force recompilation of material, for use during development, or when numInstances changes */
    me.newmat = function({codeOverrides, codePrepend, force} = {}) {
        if (!numInstances) { log('attempt to build spring materials before numInstances defined'); return; }  //
        if (me.VARY && me.lastvary === MAX_DEFS_PER_PARTICLE && !force) return;
        me.lastvary = me.VARY ? MAX_DEFS_PER_PARTICLE : 0;

        let [vert, frag] = setspringshaders(me, numInstancesP2, numInstances, MAX_DEFS_PER_PARTICLE);
        //var vert = getdata("shaders/springs.vs?x=" + Date.now());
        //var frag = getdata("shaders/springs.fs?x=" + Date.now());

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
        var shaderGenes = {};
        var textureDefines = [];
        parseUniforms(frag, shaderGenes, textureDefines);

        mat = me.material = new THREE.RawShaderMaterial({
            uniforms: springUniforms,
            vertexShader: vert,
            fragmentShader: frag,
            side: THREE.DoubleSide
        });
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.linewidth = 1;
        if (line) line.material = mat;
    };

    /** experimental method for adding custom code to springs.
     * Current pre-process steps don't manage to deal with this properly in one code block.
     * For now, passing two arguments instead.
     */
    me.testCustomForce = function() {
        me.newmat({
            codePrepend: `
            //not getting included? Also this comment confuses substitute code...
            //if it mentioned the 'v' word it would confuse it even more...
            #include pohnoise.fs;

            gene(noiseProb, 0, 0, 0.01, 0.00001, 0.00001, simulation, wtf)
            gene(noiseAmp, 0, 0, 10, 0.1, 0.01, simulation, wtf)
            `,
            codeOverrides: `
            override vec3 customForce(vec3 me) {
                vec3 force = vec3(0.0);
                if (pohnoise(me * stepsSoFar) > noiseProb) {
                    force += noiseAmp * vec3(pohnoise(me.xxx), pohnoise(me.yyy), pohnoise(me.zzz));
                }
                return force;
            }
        `
        });
    }

    var topologyarr;

    me.clearTopology = function() {
        if (topologyarr) topologyarr.fill(-1);
    }
    /** set up the spring topology infrastucture with no springs
    // This is held in  javascript topologyarr
    // and copied in glsl buffer topologybuff
    // force will make new array and buffer
    */
    me.resettopology = function (force) {
        var alen = numInstancesP2 * PARTSTEP;
        if (!topologyarr || topologyarr.length !== alen || meX.topologyarr !== topologyarr || force) {
            topologyarr = new Float32Array(alen);
            topologybuff = undefined;
        }
        // clear the array, -1 indicates no action on spring
        for (var i=0; i<alen; i++) topologyarr[i] = -1;

        me.notcreated = [];  // list of bad paired
        me.goodsprings = me.badsprings = 0;
        parms.maxActive = 1; //  (numInstances + 0.5)/numInstancesP2;
        parms.minActive = 0; //  (numInstances + 0.5)/numInstancesP2;
        if (inworker) {
            topologybuff = {}; // dummy
            return;  // in case in webWorker
        }

        if (!topologybuff || topologybuff.width !== MAX_DEFS_PER_PARTICLE || topologybuff.height !== numInstancesP2 ) {
            topologybuff = newTHREE_DataTextureNamed('topologybuff'+me.id, topologyarr, MAX_DEFS_PER_PARTICLE, numInstancesP2, THREE.RGBAFormat,
                THREE.FloatType, undefined, // type,mapping
                THREE.MirroredRepeatWrapping, THREE.MirroredRepeatWrapping,
                THREE.NearestFilter,THREE.NearestFilter );
            topologybuff.width = MAX_DEFS_PER_PARTICLE;
            topologybuff.height = numInstancesP2;

            // if (!uniforms.topologybuff) uniforms.topologybuff = { type: "t", value: topologybuff };
            springUniforms.topologybuff.value = topologybuff;
        }
        topologybuff.needsUpdate = true;
        springUniforms.roleforces = { type: 'fv', value: new Array(ROLEFORCESLENGTH).fill(1)};
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
        me.resettopology();
        for (var p = 1; p < numInstances; p++) me.addspring(p, p-1, 1,3,0);
        // impose pinchpoint 1/4 to 3/4, particle integer# a,b
        me.addspring(numInstances*1/4, numInstances*3/4);
        // me.setfix(numInstances*0.3, 0.5, 0.5, 0.5);

    // jump to help break out of straight line
        me.setfix(numInstances*0.25, 3.5, 3.5, 4.5);
        setTimeout(function() {me.removefix(numInstances*0.25);}, 1000);

    // and restart
        springUniforms.stepsSoFar.value = 0;
        setTimeout(me.start, 500);


    };

    /** convert integer particle number to 0..1 number (helper for topologyarr updates) */
    function parti2p(ai) {
        // ai may be non-integer
        return (ai+0.5) / numInstancesP2;
    }

    /** convert 0..1 particle number to integer */
    function partp2i(ai) {
        return numInstancesP2 * ai - 0.5;
    }

    /** find start offset for a particle (helper for topologyarr updates) */
    function startslot(ai) {
        // since three.js v74 texture is read other way up
    // not quite sure why ......
        return (Math.round(ai))*PARTSTEP;
    }

    const tarr = new Float32Array(4); // temp working array

    /**
    // set a free slot for a spring from a;
    // return spring number if set, undefined if not
    // allow just single spring from ai to bi for each type
    **/
    function setslot(ai, bi, len = 1, str = 1, pow = 0, type = DEFTYPE ) {
        var s = startslot(ai);
        if (s < 0 || s > topologyarr.length-1) {
            log("incorrect slot for spring " + ai + " " + bi);
            return;
        }
        var bp = parti2p(bi) + type;
        for (var i=SPSTART; i< SPEND; i++) {
            if (topologyarr[s] < 0 || topologyarr[s] === bp) {
                setat(s, bp, len, str, pow);
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
    me.pairsfor = function pairsfor(ai, f=1) {
        var pairs = [];
        var s = startslot(ai);
        for (var i=SPSTART; i< SPEND; i++) {
            if (topologyarr[s] >= 0) {
                const o = topologyarr[s];
                pairs.push({
                    bi: partp2i(o%1), role: Math.floor(o),
                    len: topologyarr[s+1], str: topologyarr[s+2], pow: topologyarr[s+3]
                });
            }
            s += DEFWIDTH;
        }
        var rod = topologyarr[s]; if (rod > 0 ) pairs.push('rod.' + partp2i(topologyarr[s]));
        s += DEFWIDTH;
        var fix = topologyarr[s]; if (fix > 0 ) pairs.push( 'fix=' + topologyarr[s+1] +','+ topologyarr[s+2] +','+  topologyarr[s+3]);
        s += DEFWIDTH;
        var pull = topologyarr[s+3]; if (pull > 0 ) pairs.push( 'pull=' + topologyarr[s] +','+ topologyarr[s+1] +','+ topologyarr[s+2] +','+  topologyarr[s+3]);
        if (typeof f === 'function') pairs = f(pairs);
        else if (f) pairs = format(pairs);
        return pairs;
    }


    /** free slot for a spring from a to b; */
    function dropslot(ai, bi, type = DEFTYPE) {
        var s = findslot(ai, bi, type);
        if (s !== -1) {
            setat(s, -1,-1,-1,-1);
            return true;
        } else {
            //  console.log("No springs found ", ai, bi);
            return false;
        }
    }
    me.dropslot = dropslot;

    /** find slot number for ai to bi */
    function findslot(ai, bi, type = DEFTYPE) {
        var s = startslot(ai);
        var bp = parti2p(bi) + type;
        for (var i = SPSTART; i < SPEND; i++) {
            if (topologyarr[s] === bp)
                return s;
            s += DEFWIDTH;
        }
        return -1;
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
        var bad = 0;
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


    /** set a rod enforcing distance of ai to bi */
    me.addrod = function(ai, bi, len) {
        addat(RODPOS, ai, bi, len !== undefined ? len : 1, -1, -1, true);
    };

    /** remove rod from ai */
    me.removerod = function(ai) {
        removeat(RODPOS, ai);
    };

    /** set a pull of ai to point x,y,z */
    me.addpull = function(ai, x,y,z,force = 1) {
        if (x.x !== undefined) ({x,y,z} = x);
        // addat(PULLPOS, ai, x, y, z, force, true);
        var s = startslot(ai) + PULLPOS*DEFWIDTH;
        setat(s, x, y, z, force);
    };

    /** get fixed position of particle ai (if any), return vector or undefined */
    me.getpull = function(ai) {
        const r = getat(PULLPOS, ai);
        if (r[0] === -1) return undefined;
        return {pos: new THREE.Vector3(r[0], r[1], r[2]), force: r[3]};
    };

    /** remove pull from ai */
    me.removepull = function(ai) {
        removeat(PULLPOS, ai);
    };

    /** set a fix enforcing position of ai */
    me.setfix = function(ai, x = 0, y = 0, z = 0) {
        if (x.x !== undefined) { y = x.y; z = x.z;  x = x.x; }  // allow vector input
        else if (x[0] !== undefined) { y = x[1]; z = x[2];  x = x[0]; }  // allow vector input
        // NOTE fix has x,y,z in t,z,w slots
        addat(FIXPOS, ai, 1, x,y,z);
    };

    /** get fixed position of particle ai (if any), return vector or undefined */
    me.getfix = function(ai) {
        const r = getat(FIXPOS, ai);
        if (r[0] === -1) return undefined;
        return new THREE.Vector3(r[1], r[2], r[3]);
    };

    /** query if particle is fexed */
    me.hasfix = function(ai) {
        const r = getat(FIXPOS, ai);
        return (r[0] !== -1);
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
        if (!topologyarr) me.resettopology();
        var s = startslot(ai) + pos*DEFWIDTH;
        if (s < 0 || s > topologyarr.length-1) {
            log("incorrect rod " + ai);
            return;
        }
        return _getat(s);
        // ?? should we return a more structured value?
        // ?? var bp = parti2p(bi);
    }


    /** helper.  add  a spring field at position pos within the spring (eg for rod) */
    function addat(pos, ai, bi, y = -1, z = -1, w = -1, warn = false) {
        if (!topologyarr) me.resettopology();
        var s = startslot(ai) + pos*DEFWIDTH;
        if (s < 0 || s > topologyarr.length-1) {
            log("incorrect rod " + ai);
            return;
        }
        var bp = parti2p(bi);
        // if (warn && topologyarr[s] > 0) log("rod about to be overridden from ", ai);

        setat(s, bp, y, z, w);
    }

    /** helper.  remove a spring field at position pos within the spring (eg for rod) */
    function removeat(pos, ai) {
        var s = startslot(ai) + pos*DEFWIDTH;
        setat(s, -1,-1,-1,-1);
    }

    /** set some shderdefs for spring demo */
    function setdefines() {
        // now in hornmaker
        //shaderdef("histpost(p,t)", "texture2D(posHist, vec2(histtime - (t), (p)))"); // particle position t units ago

        //shaderdef("histpos(p)", "texture2D(posNewvals, vec2(0, (p)))"); // particle position now

        return;
    }

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
    var fback = function() {  // from springs.js for backbone only
horn("back").ribs(2000).radius(0.3)
.code("vec4 pp = histpos(back_rp * 0.8 + 0.1 ); x += pp.x; y += pp.y; z += pp.z;")
.xcode("vec4 pp =vec4(back_rp * 100, 0, 0, 0.); x += pp.x; y += pp.y; z += pp.z;")
.xcode("xcol = vec4( back_rp, 1.-back_rp, 0.5, 0.) * (fract(back_rp*PARTICLES+0.55)<0.1 ? 5. : 1.);")   // broken with separate pipe passes
.xcode("r *= (fract(back_rp*PARTICLES+0.6)<0.2 ? 1. : 0.1);")
;
var mainhorn="back";
    };


    // tranrule for sheet ~ saved as function to help syntax verification
    var fsheet = function() {
// from springs.js for sheet only
ugene("histwidth", 0.9, 0, 1, 0.1, 0.01, "width of history to show", "springs");
ugene("histoffset", 0, -1, 1, 0.1, 0.01, "offset of history to show", "springs");

horn("sheet").ribs(2000).radius(0.000001)
.code("vec4 pp = histpost(rawp.y*histwidth + histoffset, sheet_rp); x = pp.x; y = pp.y; z = pp.z;")  //   // broken with separate skeleton and 'y-circle' horn logic
.xcode("xcol = vec4( sheet_rp, 1.-sheet_rp, 0.5, 0.) * (fract(sheet_rp*PARTICLES+0.55)<0.1 ? 5. : 1.); r=0.0;")
.xcode("xcol.w = fract((1.+histtime)*0.5 + rawp.y) < 0.7 ? -99. : 1.")
;
var mainhorn="sheet";
    };

    // tranrule for combination ~ saved as function to help syntax verification
    var fboth = function() {  // from springs.js for backbone and sheet
ugene("histwidth", 0.9, 0, 1, 0.1, 0.01, "width of history to show", "springs");
ugene("histoffset", 0, -1, 1, 0.1, 0.01, "offset of history to show", "springs");

// from springs.js for backbone and sheet
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
var mainhorn="both";

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
        mat = undefined;
        me.setup();
        //me.step();
        me.demotopology(numparticles);
        me.back();
        me.start();
        usemask=1; // << TODO check why and fix
        setInput(W.genefilter, 'spr | rad');
        parms.stepsPerStep = 50;
        springUniforms.stepsSoFar.value = 0;  // will force reinit of positions
        springUniforms.pushapartforce.value = 0.00001;

    };

    /** start spring simulation on each frame */
    me.start = function(onop = 'preframe') {
        me.se = Maestro.onUnique(onop, me.step);
        me.running = onop;
    };

    /** stop spring simulation on each frame */
    me.stop = function() {
        Maestro.remove(me.running, me.step);
        me.se = undefined;
        me.running = false;
    };

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
        springUniforms.stepsSoFar.value = 0;  // will force reinit of positions
        me.step();
        newmain();
        meX.settleHistory();
        workhisttime = 0.5/WORKHISTLEN;
        histtime = 0.5/HISTLEN;
    };

    // save current xyzs to fid (unless not given), return string
    me.save = function(fid, start = 0 , step = 1, len = numInstances ) {
        var d = readWebGlFloat(posNewvals, {mask: 'xyz'});
        var s = [];
        for (let i=0; i < len; i++) {
            s.push( [start + step * i, d[0][i].toFixed(3), d[1][i].toFixed(3), d[2][i].toFixed(3)].join('\t') );
        }
        var r =  s.join('\n') + '\n'
        if (fid) writetextremote(fid, r);
        return r;
    }

    //consider how the time this function takes relates to state of graphics pipeline:
    //converting buffers on GPU in readWebGlFloat
    //reading back the result later (beginning of subsequent frame)
    me.getpos = function springsgetpos(all = false) {
        const sid = 'springsgetpos' + id;
        const d = readWebGlFloat(posNewvals, {channels: 3}, sid);
        var s = [];
        for (let i=0; i < (all ? numInstancesP2 : numInstances); i++) {
            const i3 = 3*i;
            const v = new THREE.Vector3();
            v.x = d[i3]; v.y = d[i3 + 1]; v.z = d[i3 + 2];  // using constructor fails for NaN
            s.push(v);
        }
        return s;
    }

    /** goto saved array of spring positions */
    me.setpos = function(pos) {
        for (let i = 0; i < pos.length; i++)
        springs.setfix(i, pos[i]);
        springs.finishFix();
    }

    me.getWorkHist = function(all = false) {
        var d = readWebGlFloat(posWorkhist, {mask: 'xyz'});
        let rows = [];
        for (let j=0; j<WORKHISTLEN; j++) {
            var s = [];
            rows.push(s);
            for (let i=0; i < (all ? numInstancesP2 : numInstances); i++) {
                let i2 = i + j*WORKHISTLEN;
                s.push( new THREE.Vector3( d[0][i2], d[1][i2], d[2][i2]));
            }
        }
        return rows;
    }

    /** go to given particle (number)
    If not given, centre on avarage of selections
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
    me.finishFix = function() {
        springs.step();
        springs.settleHistory();
        for(let i=0; i<numInstances; i++)
            springs.removefix(i)
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

    /** transform all positions by function f, optionally centre before f, and move back after f */
    me.transformPositions = function springs_transformPositions (f, precen = true, postcen = true) {
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
        me.step();
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
//        springs.addspring(5,6,1);
//        springs.addspring(6,7,1);
//        springs.addspring(4,5,1);
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
    me.helix = function({step = 10, pitch = 2, rad, start = 0, end = me.numInstances, strength = 0.1} = {}) {
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

    //me.start();
    return this;
};
Springs.prototype.toString = function() { return '[Springs ' + this.id + "]" };

var springs = new Springs();

// for debug ...
function spring_stepshow(s) { springs.stepshow(s); }
function springnew() { springs.repos(); };

function checkMaterial(mat) {
    if (!checkMaterial.scene) {
        checkMaterial.scene = newscene('springcheckmaterial');
        checkMaterial.camera = new THREE.OrthographicCamera();
        checkMaterial.geom = new THREE.PlaneGeometry(1,1);
        checkMaterial.geom.frustumCulled = false;
        checkMaterial.mesh = new THREE.Mesh(checkMaterial.geom);
        checkMaterial.scene.addX(checkMaterial.mesh);
        checkMaterial.rt = WebGLRenderTarget(1,1, 'springs.checkmat');
    }
    checkMaterial.mesh.material = mat;
    renderer.render(checkMaterial.scene, checkMaterial.camera, checkMaterial.rt);
}

function springBufferGUI() {
    var g = V.DebugGui = dat.GUIVR.createX("debug");
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
