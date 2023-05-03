'use strict';

var THREE, numInstancesP2, numInstances, renderer, CSynth, uniforms, log, W, V, dat, guiFromGene,
addgeneperm, copyFrom, CSynthFast, G, glsl, HW;

/** simplified rendering for non-organic use */
CSynth.SphereParticles = function() {
//TODO: experiment with making these shaders more integrated with standard three stuff.
//see https://medium.com/@pailhead011/extending-three-js-materials-with-glsl-78ea7bbb9270
    addgeneperm('sphereRadius', 20, 0, 100,  0.1, 0.1, 'sphere radius for particles', 'geom', 0);
    //some confusion about ranges / specs here... in particular, why are these ending up massive?
    addgeneperm('selectedSphereRadius', 0.8, 0, 100,  0.1, 0.1, 'sphere radius for selected particles', 'geom', 0);

    const me = this;
    const uniformsC = { sphereRadius: W.uniforms.sphereRadius };
    //this doesn't do a deep clone, which I believe to be what we want.
    //Are there any uniforms that *should* remain related?
    copyFrom(uniformsC, CSynth.getCommonUniforms());
    //these should not be clones...
    uniformsC.t_ribboncol = {type: "t", value: undefined};

    const materialExperiment = new THREE.MeshStandardMaterial();
    const material = materialExperiment; //deleted old 'non-Experimental' code...
    materialExperiment.onBeforeCompile = shader => {
        material.xshader = shader;  // for debug
        //shader.uniforms.sphereRadius = window.uniforms.sphereRadius;
        // copy all possible uniforms, most are irrelevant
        // TODO: cleanup curious sharing of uniformsC, for now it makes sure colour gets set right
        for (let n in window.uniforms) if (!shader.uniforms[n]) shader.uniforms[n] = window.uniforms[n]
        for (let n in uniformsC) shader.uniforms[n] = uniformsC[n]
        //modify vertex shader so that it gets the right world transform based on our GPU data
        //prepend CSynth.CommonShaderCode() & other uniforms / attributes / varyings
        //XXX: some things like matrix uniforms are defined by both CommonShaderCode & prefixVertex in WebGLProgam (not ShaderChunks)
        //prefixVertex will be prepended to vertexShader *after* we've finished with it here.
        //For now, "#ifndef SHADER_NAME" around those known to cause error in CommonShaderCode.
        shader.vertexShader = /*glsl*/`//--- spherevis vertex preamble
            ${CSynth.CommonShaderCode()}
            uniform float sphereRadius;
            uniform float selectedSphereRadius;
            attribute float instanceIDx;

            varying float rpx;
            \n//-----------------
            ${shader.vertexShader}`;

        //replace "#include <worldpos_vertex>" with our vertex code.
        //may need to pay closer attention to <project_vertex> as well.

        const toreplace = '#include <project_vertex>'
        shader.vertexShader = shader.vertexShader.replace(toreplace, /*glsl*/`
        //--- spherevis ${toreplace}
            float rp = (instanceIDx) / numInstancesP2;
            vec3 ppos = partposWorld(rp).xyz;

            float rpcol = (instanceIDx) / numSegs;

            float selected = 0.;
            for (int i=0; i<PICKNUM; i++) {
                float p = getPick(i);
                if (p > 99.) continue;
                float v = isInPickRange(rpcol, p, 1./255., t_ribboncol);
                selected = max(selected, v);
            }
            float r = mix(sphereRadius, selectedSphereRadius, selected);

            vec3 rotpos = mat3(modelMatrix) * position;   // modelMatrix here for scale and rotation
            transformed = (r * scaleFactor) * rotpos + ppos;  // transformed has modelMatrix
            vec4 mvPosition = viewMatrix * vec4( transformed, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
            vNormal = normalize(rotpos);
            rpx = rpcol;
        //----------------- end  spherevis worldpos_vertex
        `);

        // it may be we don't need to patch this, but I think this is more appropriate
        //
        // Stephen, 1 Sept 2019
        const toreplace2 = '#include <worldpos_vertex>';
        shader.vertexShader = shader.vertexShader.replace(toreplace2,
            /*glsl*/`//-- spherevis ${toreplace2}
            vec4 worldPosition = vec4( transformed, 1.0 );`);

        //modify fragment shader to incorporate custom picking, bypassing majority of shader.
        //this is liable to fall foul of THREE caching mechanism:
        //in spherevisFragMaterial, we have paths for picking defined / undefined... cf. shadow passes.
        //they use mesh.customDepthMaterial, which we'll also want... but it's very much separate from other material.
        //perhaps we should put our different passes into different scenes?

        //Think about how extradefines / opmodes are handled in graphbase; a RawShaderMaterial is made for each different version
        //this is then saved in matopmode[matkey / fulltrankey]
        //can't understand where this PICKING comes from; would expect to see something like #if OPMODE == OPPICK
        //might be a red herring trying to understand picking from the perspective of these spheres.

        //think about how picking itself is handles, in threek pickGPU -> graphbase renderObjPipe -> (i)pipeop -> p.renderPass
        //p.renderPass I think is derived from global renderPass (which seems stateful in a not very nice way, see horn.js renderHornobj)
        //see also some similar notes to this at a different stage of development, bottom of matrix.js

        // sjpt 1 Sept 2019
        // This does the basic colouring.
        //
        // Still to work out how this interacts with picking.
        // pickingColor us never actually set anywhere in the code.
        // I think that picking probably does not work except on the organic pipeline
        // and never worked on spherevis or other shaders.
        // We could however extend the colour code to display picking ???

        shader.fragmentShader = /*glsl*/`
            // #extension GL_OES_standard_derivatives : enable
            uniform mat4 modelMatrix;  // not really used, but called
            ${CSynth.CommonFragmentShaderCode()}
            varying float rpx;
            #ifdef PICKING
                uniform vec3 pickingColor;
            #else
                // vec3 color = vec3(1.,1.,1.);
            #endif
            ` + shader.fragmentShader;

        const toadd3 = '#include <map_fragment>';
        shader.fragmentShader = shader.fragmentShader.replace(toadd3, /*glsl*/`
            ${toadd3}
            //-- spherevis after ${toadd3}
            vec3 color = bedColor(rpx);

            #ifdef PICKING
                diffuseColor *= vec4( pickingColor, 1.0 );
            #else
                diffuseColor *= vec4( color, 1.0 );
                //vec3 fdx = dFdx( vPosition );
                //vec3 fdy = dFdy( vPosition );
            #endif
        `);
    }

    var res;
    var geometry;
    var mesh = new THREE.Mesh(geometry, material);
    this.setres = function(a, b = a) {
        res = [a, b];
        var sphere = new THREE.SphereBufferGeometry(1, a, b);
        geometry = new THREE.InstancedBufferGeometry();
        geometry.copy(sphere);
        delete geometry.attributes.uv;
        geometry.name = 'SphereParticles geometry';
        material.name = 'SphereParticles material';
        if (HW.instanceIDBuff) me.setInstances();
        if (mesh) mesh.geometry = geometry;
    }

    mesh.name = 'SphereParticles';
    mesh.visible = false;  // initially, for now
    mesh.frustumCulled = false;
    V.rawscene.remove(V.rawscene.sphereparticles);
    V.rawscene.add(mesh);
    V.rawscene.sphereparticles = mesh;


    // set up instances, n parameter mainly for debug (but why do we have an extra particle, to check >>>
    this.setInstances = function setInstances(n = numInstances, start = 0) {
        const newstart = HW.instanceids[0] !== start;
        if (HW.instanceids.length < n || newstart) {
            for (let i = HW.instanceids.length; i < n * 1.3 + 50; i++) HW.instanceids.push(i + start);
            if (newstart) for (let i = 0; i < HW.instanceids.length; i++) HW.instanceids[i] = i + start;
            //three100: THREE.InstancedBufferAttribute: The constructor now expects normalized as the third argument.
            //was meshPerAttribute in r86: https://github.com/mrdoob/three.js/blob/r86/src/core/InstancedBufferAttribute.js
            HW.instanceIDBuff = new THREE.InstancedBufferAttribute( new Float32Array(HW.instanceids), 1, true );
        }

        HW.instanceIDBuff.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute( 'instanceIDx', HW.instanceIDBuff ); // per mesh instance
        geometry.instanceCount = geometry._maxInstanceCount = n;    // _maxInstanceCount needed as three does not handle instancing very well
    }

    me.setres(CSynthFast ? 7 : 17);
    me.setInstances();


    this.createGUIVR = function() {
        var gui = dat.GUIVR.createX("SphereParticles");
        gui.add(mesh, 'visible').listen().showInFolderHeader();
        CSynth.addColourGUI(gui, uniformsC);

        const xx = W.xxx = {
            get diameter() { return G.sphereRadius * G.nmPerUnit * 2; },
            set diameter(v) { G.sphereRadius = v / G.nmPerUnit * 0.5; },
            get selectedDiameter() { return G.selectedSphereRadius * G.nmPerUnit * 2; },
            set selectedDiameter(v) { G.selectedSphereRadius = v / G.nmPerUnit * 0.5; },
            get res() { return res[0]; },
            set res(v) { me.setres(v) }
        }

        // guiFromGene(gui, 'sphereRadius');
        gui.add(xx, 'diameter', 1, 50).step(0.1).listen();
        gui.add(xx, 'selectedDiameter', 1, 50).step(0.1).listen();
        gui.add(xx, 'res', 3, 100).step(1).listen();
        return gui;
    }


}   // SphereParticles
