// old code used for LMV and simple pre-organic rendering
'use strict';

var THREE, numInstancesP2, numInstances, renderer, CSynth, uniforms, currentGenes, log, W, V, dat, guiFromGene,
addgeneperm, copyFrom, CSynthFast, G;

/** simplified rendering for non-organic use, do not bother with overwriting three.js line material, just make new */
CSynth.LineVis = function() {
const linevisVertMaterial = `
    // linevis vertex
    ${CSynth.CommonShaderCode()}
    //#define SHADER_NAME vertMaterial
    // 'position' attribute is not really a position, but three.js likes to see position to decide count
    // position contains two integer indices into line ends, x for 'this' end and y for other end.
    // x is used to lookup position, and x,y to lookup in IF map for strenght/colour.
    // We may change later to use CSynth.colchoice and nval()
    // so that it can handle distances and other details (as in matrix).

    uniform float ifmax;
    uniform sampler2D contactbuff;
    varying vec4 col;

    // Pending use later ???
    //uniform float minActive, maxActive, maxBackboneDist, nonBackboneLen,
    //    representativeContact, m_k, m_alpha, m_force, pushapartforce, pushapartpow, contactforcesc, powBaseDist,
    //    matrixcontactmin, matrixcontactmult;
    ${' ' || CSynth.colchoice}

    void main() {
        float rp = (position.x) / numInstancesP2;   // spring buffer uses numInstancesP2
        vec3 ppos = partposWorld(rp).xyz;
        vec3 vPosition = (viewMatrix * vec4(ppos, 1.0) ).xyz;
        gl_Position = logdepth(projectionMatrix * vec4( vPosition, 1.0 ));

        // IF buffer uses numInstances x numInstances
        float v = texture2D(contactbuff, vec2(position.xy) / numInstances + 0.5).x /  ifmax;
        v = clamp(v, 0., 1.);
        col = vec4(v , 1.-v, 0.2, 1);
        if (v == 0.) gl_Position.w = sqrt(-1.); // force NaN and the line won't be drawn, no discard in vertex shader
    }
`

const linevisFragMaterial = `
    // linevis fragment
    ${CSynth.CommonFragmentShaderCode()}
    //#define SHADER_NAME fragMaterial
    varying vec4 col;

    void main()    {
        gl_FragColor = col;
    }
`

    var me = this;
    var uniformsC = { ifmax: {value: 1} };
    //this doesn't do a deep clone, which I believe to be what we want.
    //Are there any uniforms that *should* remain related?
    copyFrom(uniformsC, CSynth.getCommonUniforms());

    var material = V.linevismat = new THREE.RawShaderMaterial( {
        uniforms: uniformsC,
        vertexShader: linevisVertMaterial,
        fragmentShader: linevisFragMaterial
    });

    var res;
    this.setres = function(n) {
        geometry = new THREE.BufferGeometry();
        const nl = n * (n-1)/2;  // number of lines
        var pairs = new Uint16Array(4 * nl);
        let k = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i+1; j < n; j++) {
                pairs[k++] = i;
                pairs[k++] = j;
                pairs[k++] = j;
                pairs[k++] = i;
            }
        }
        const att = new THREE.BufferAttribute( pairs, 2, false );
        geometry.addAttribute( 'position', att ); // per mesh instance
        geometry.maxInstancedCount = nl;
        if (lineSegs) lineSegs.geometry = geometry;
    }

    var geometry;
    this.setres(numInstances);

    var lineSegs = new THREE.LineSegments(geometry, material);
    lineSegs.name = 'lineVis';
    lineSegs.visible = false;  // initially, for now
    lineSegs.frustumCulled = false;
    V.rawscene.remove(V.rawscene.lineSegs);
    V.rawscene.add(lineSegs);
    V.rawscene.lineSegs = lineSegs;

    this.createGUIVR = function() {
        var gui = dat.GUIVR.createX("linevis");
        gui.add(lineSegs, 'visible').listen().showInFolderHeader();
        gui.add(uniformsC.ifmax, 'value', 0, 50).name('ifmax').step(0.1).listen();

        // CSynth.addColourGUI(gui, uniformsC);
        return gui;
    }
}   // lineParticles
