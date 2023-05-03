//////////////////
// todo 30 May 2017, use the standard autopan
// find out why it doesn't like planeg, even with uv avoided


// something similar-ish to matrix, but using history and with appropriate blending options...
'use strict';

//var CSynth, planeg, GX;

// Do we want to make these be functions that you call with 'new CSynth.HistoryTrace()'
// or rather objects made accessible...  In the case of Matrix, we may well want several instances, differently configured.
// xsteps controls the granularity along the ribbon, 1 = 1 step per particle
CSynth.HistoryTrace = function({xsteps = 1, numhist = undefined} = {}) {
    const vertcol = CSynth.HistoryTrace.vertcol;
    let histlen = numhist || springs.getHISTLEN();
    let histalong = numInstances*xsteps - 1;  // did use CSynth.current.numInstances, but did not work for Organic


    const col = /*glsl*/`
uniform float opacity;
uniform float fadeFactor;
uniform float saturation;
uniform float brightness, pickbrightness, pickwidth;
uniform float highlightTime;
uniform float highlightStrength;
uniform float highlightStrengthSelection;
uniform float highlightStripes;
uniform float highlightShape; //use might change, 0..1 for how quickly each stripe falls off
uniform float particleWidth;    // set small just to show track of particles
uniform float nonParticleStrength;  // strength for non-particle

uniform vec3 startCol, endCol;

// find the colour for a given point ... uv.y will be in 0..1 for 0..numSegs particles
vec4 col(vec2 uv) {
    float rp = uv.y;        // v or uv.y is distance along chain
    float alpha = opacity * pow(1. - uv.x, fadeFactor);

    //vec3 c = hsv2rgb(vec3(uv.y, saturation, brightness));
    vec3 c = bedColor(rp);  //
    vec3 bed = c;
    //vec4 bed = texture2D(t_ribboncol, vec2(rp, 0.25));    // beds now have 2 rows
    //float ti = bed.w * 255.;
    //vec3 c = vec3(ti,ti,ti);
    c = rgb2hsv(c);
    c.y = c.y * saturation;
    // c.z = c.z * abs(brightness);
    c = hsv2rgb(c);
    c *= brightness;

    c *= mix(startCol, endCol, uv.x);

    // c += vNormal * normalViz;

    // NONOX If we include the code below in the vertex shader we get a very curious D2D error
    // NONOX so for now just remove pick display when using vertcol
    // ${vertcol ? 'vCol = col (xuv);' : ' vUv = xuv;'} D2D (?D3D) error no longer seems to happen, so picking allowed with vertcon as well
    // TODO In the longer term, the col () function will be prebaked as a separate texture.
    //
    // highlight picked points ... alignment is wrong for some reason...
    float selected = 0.;
    for (int i=0; i < PICKNUM; i++) {
        float p = getPick(i);
        if (p > 99.9) continue;
        float v = isInPickRange(rp, p, 1./255., t_ribboncol);
        if (v > 0.4) {
            //if (abs(rp-p) < pickwidth) { //consider different highlight combination / options
            vec3 pcol = bed; //getPickColor(i);
            c += pcol * pickbrightness;
            selected = 1.;
            alpha *= 2.;
        }
    }

    if (true) { // echos
        //this should probably always be in frag as it's cheap & would benefit from fidelity
        float w = 1./highlightStripes;
        float t = abs(-mod(highlightTime - uv.x, w));
        // float t = abs(highlightTime - uv.x);
        t = 1. - smoothstep(0., w * highlightShape, t);
        t *= highlightStrength; // * selected;
        c += vec3(t);
        alpha += t;
    }
    return vec4(c, alpha);
}
`;
    // see also addfragment
    const vert = /*glsl*/`
        // historyTrace vertex Shader
        ${CSynth.CommonShaderCode()}
        uniform vec3 travelDir;
        #define KILLRADLEN ${WA.KILLRADLEN}
        uniform float killrads[KILLRADLEN];
        uniform float killradwidth;
        uniform float ribbonStart, ribbonEnd;
        uniform bool isCubic;

        //uniform float numSegs,numInstancesP2;
        ${vertcol ? 'varying vec4 vCol' + col : 'varying vec2 vUv'};

        // varying vec3 vNormal;


        // puv.x is time normalized 0..1, puv.y should be normalised to relative position,
        vec4 posf(in vec2 puv) {
            //TODO: cubic interpolation?
            vec4 pos;
            if (isCubic) {
                pos = histpostCubic(puv.y, puv.x) * scaleFactor;
            } else {
                vec2 puv2 = vec2(fract(1. + histtime - puv.x), puv.y);      // time, partice
                pos = texture2D(posHist, puv2) * scaleFactor;
            }
            pos.xyz += travelDir * puv.x;
            pos.w = 1.0;
            return pos;
        }

        vec3 norm(in vec2 puv, in vec4 p0) { //....
            const float epsx = 1./${histlen}.0;
            const float epsy = 1./${histalong}.0;
            vec2 uvx = puv + vec2(epsx, 0.);
            bool swap = false;
            if (uvx.x > 1.) {
                swap = true;
                uvx = puv - vec2(epsx, 0.);
            }
            vec4 p1 = posf(uvx);
            vec3 d1 = normalize(p1.xyz - p0.xyz);
            vec2 uvy = puv + vec2(0., epsy);
            if (uvy.y > 1.) {
                swap = !swap;
                uvy = puv - vec2(0., epsy);
            }
            vec4 p2 = posf(uvy);
            vec3 d2 = normalize(p2.xyz - p0.xyz);
            return swap ? cross(d2, d1) : cross(d1, d2);
        }

        void main() {
            vec2 xuv = position.xy + 0.5;   // do not use uv, not passed by optimized planeg, 0..1
            // xuv.x = xuv.x * (1. -1. /HISTLEN) + 0.5/HISTLEN;     // avoid the wrapping seam,
            // histtime in posf includes a 0.5/HISTLEN offset ??

            xuv.x *= 1. -1.001/HISTLEN;     // avoid the wrapping seam

            // this gets correct width, BUT is causing issues in the interpolation ends looking at particles out of range
            // rp = xuv.y * Normalised ToTexCo * (numInstances/numSegs) + 0.5/numInstancesP2;
            float id = xuv.y * numSegs;  // input is 0..1 => 0..numSegs, eg first particle at 0, last particle at 1.

            //float rp = xuv.y * Normalised ToTexCo + 0.5/numInstancesP2;
            //rp = xuv.y * numSegs / numInstancesP2; // ???
            float rp = (xuv.y*numSegs + 0.5)/numInstancesP2;    // index for looking up in springs
            float NaN = sqrt(-1. + 0.000000001*rp);

            vec4 pos = posf(vec2(xuv.x, rp));


            // for autopan, taken from hornmaker ... assumes GPUSCALE for simplicity
            #ifndef NOCENTRE
        	    vec4 xx = texture2D(scaleDampTarget, vec2(0.5 ,0.5));
                pos.xyz -= xx.xyz;
            #endif

            // vNormal = norm(xuv, pos);
            pos.w = 1.0;

            ${vertcol ? 'vCol = col(xuv);' : ' vUv = xuv;'}

            gl_Position = logdepth(projectionMatrix * modelViewMatrix * pos);

            // killrads in particles, this is used to create breaks between chains/chroms, eg in full yeast example
            // we need killradwidth to take out all details
            for (int i=0; i < KILLRADLEN; i++) {
              if (abs(id - killrads[i]) <= killradwidth * 2.) {
                // ${vertcol ? 'vCol = vec4(0);' : ' vUv = vec2(NaN);'}
                gl_Position = vec4(NaN);
              }
            }
            if (xuv.y < ribbonStart || xuv.y > ribbonEnd) gl_Position = vec4(NaN);
        }
    `;

    const frag = /*glsl*/`
        // historyTrace fragmentShader
        ${CSynth.CommonFragmentShaderCode()}
        // uniform float normalViz;

        // varying vec3 vNormal;
        ${vertcol ? 'varying vec4 vCol;' : 'varying vec2 vUv;' + col}
        uniform float colMult; // -1 for negative color mode, 1 otherwise...

        void main() {
            // gl_FragColor = vec4(1,1,1,0.1); return;
            float fractp = fract(vUv.y * numSegs);      // ONLY VALID FOR VERTCOL false
            if (fractp > particleWidth*0.5 && fractp < 1.-particleWidth*0.5 && nonParticleStrength != 0.) discard;

            gl_FragColor = ${vertcol ? 'vCol' : 'col(vUv);'};
            if (fractp > particleWidth*0.5 && fractp < 1.-particleWidth*0.5) gl_FragColor.rgb *= nonParticleStrength;
            // fold alpha values into opacity: see long comment at end on blending ....
            gl_FragColor.rgb *= colMult;
            gl_FragColor.rgb *= gl_FragColor.a;
            gl_FragColor.a = 1.;
        }
    `;



    // for future ref, comments on synthesising vertices in shader:
    //https://devtalk.nvidia.com/default/topic/561172/opengl/gldrawarrays-without-vao-for-procedural-geometry-using-gl_vertexid-doesn-t-work-in-debug-context/
    //divisions could be number of particles, needn't necessarily be - will interpolate.
    var geo;
    // PlaneBufferGeometry is more efficient than PlaneGeometry
    // planeg is more efficent still
    //if (!geo) geo = new THREE.PlaneBufferGeometry(1, 1, 512, 512);    // #planeg#
    this.newgeo = function(phistlen = 0, pxsteps = 1) {
        histlen = Math.floor(phistlen || springs.getHISTLEN());
        histalong = Math.floor(numInstances*pxsteps - 1);  // did use CSynth.current.numInstances, but did not work for Organic
        geo = HW.planeg(1, 1, histlen, histalong);
        for (const m of sheet.children) (m as THREE.Mesh).geometry = geo;
    }

    if (!geo) geo = HW.planeg(1, 1, histlen, histalong);
    const htuniforms: any = CSynth.HistoryTrace.uniforms = {
        travelDir: { value: new THREE.Vector3(0, 0, 0) },
        opacity: { value: 0.01 },
        saturation: { value: 0.5 },
        brightness: { value: 1 },
        pickbrightness: { value: 3 },
        pickwidth: { value: 0.001 },
        fadeFactor: { value: 4 },
        highlightTime: { value: 1 },
        highlightStrength: { value: 0.4 },
        highlightStrengthSelection: { value: 0.4 },
        highlightStripes: { value: 1 },
        highlightShape: { value: 0.1 },
        particleWidth: { value: 1},
        nonParticleStrength: { value: 0},
        normalViz: { value: 0 },
        colMult: { value: 1 },
        startCol: { value: new THREE.Vector3(1, 1, 1)},  // << no api or giu to this yet
        endCol: { value: new THREE.Vector3(1, 1, 1)},
        cubicCatS: window.uniforms.cubicCatS,
        killrads: window.uniforms.killrads,
        killradwidth: window.uniforms.killradwidth,
        ribbonStart: window.uniforms.ribbonStart,
        ribbonEnd: window.uniforms.ribbonEnd,
        isCubic:  {value: false}
    };
    copyFrom(htuniforms, CSynth.getCommonUniforms());
    htuniforms.t_ribboncol = {type: "t", value: undefined};
    Maestro.on("preframe", ()=> {
        htuniforms.highlightTime.value = 1 - (Date.now() * 0.2) % 1000 / 1000;
        if (keysdown.join('') === 'Q') htuniforms.highlightTime.value = 1 - lastdocx/width;
        //htuniforms.highlightTime.value = 0.5 + 0.5*Math.sin(Math.PI * 2 * Date.now() / 1000);
    });

    const mat = new THREE.RawShaderMaterial({
        uniforms: htuniforms,
        vertexShader: vert,
        fragmentShader: frag
    });
    mat.transparent = !CSynthFast;
    mat.blending = THREE.AdditiveBlending; //was this not here before?? not going to test this change just now, must get back to it soon...
    //mat.opacity = 0.8;
    mat.side = THREE.DoubleSide;
    mat.depthWrite = false;
    const sheet = this.sheet = new THREE.Group();// new THREE.Mesh(geo, mat);
    sheet.visible = false;
    sheet.name = 'historyTraceGroup';
    let invert = false;
    Object.defineProperty(this, 'invertCol', {
        get: () => { return invert; },
        set: (v) => {
            invert = v;
            htuniforms.colMult.value = invert ? -1 : 1;
            mat.blending = invert ? THREE.SubtractiveBlending : THREE.AdditiveBlending;
        }
    });
    sheet.name = 'historytrace';
    sheet.frustumCulled = false;
    V.rawscene.remove(V.rawscene.historytrace);  // just one historytrace for now (maybe with children)
    V.rawscene.add(sheet);
    V.rawscene.historytrace = sheet;

    let rots = 1;
    Object.defineProperty(this, 'rotations', {
        get: () => { return rots; },
        set: function(copies) {
            rots = copies;
            sheet.children = [];
            for (let i=0; i<copies; i++) {
                let m = new THREE.Mesh(geo, mat);
                m.rotation.z = Math.PI * 2 * i / copies;
                m.name = 'historytrace' + i;
                m.frustumCulled = false;
                //m.renderOrder = 1; //doesn't seem to be helping z-index issue
                sheet.add(m);
            }
        }
    });
    this.rotations = 1;

    this.ThreeObject = sheet;
    var _h = this;

    this.createGUIVR = function() {
        const gui = dat.GUIVR.createX("HistoryTrace");
        gui.add(sheet, 'visible').listen().showInFolderHeader();
        const u = mat.uniforms;

        //colour by
        CSynth.addColourGUI(gui, u);

        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        gui.add(u.opacity, 'value', 0, 1).listen().name('Opacity');
        gui.add(_h, 'invertCol').listen().name('Subtractive color').setToolTip('For use with light backgrounds');
        gui.add(u.saturation, 'value', 0, 1).listen().name('Saturation');
        gui.add(u.brightness, 'value', 0, 1).listen().name('Brightness');
        gui.add(u.pickbrightness, 'value', 0, 3).listen().name('Pick Brightness');
        gui.add(u.pickwidth, 'value', 0, 0.01).step(0.0001).listen().name('Pick Width');
        gui.add(u.particleWidth, 'value', 0, 1).listen().name('Particle width').setToolTip('width of the trace to track particles');
        gui.add(u.nonParticleStrength, 'value', 0, 1).listen().name('non particle strength').setToolTip('strength of parts of the trace that are not on the particle');
        gui.add(u.isCubic, 'value', 0, 1).listen().name('isCubic').setToolTip('whether to use cubic');

        // gui.add(currentGenes, 'scaleFactor', 1, 100).listen().name('Scale Factor');
        gui.add(u.fadeFactor, 'value', 0.1, 10).listen().name('Fade Factor');
        gui.add(_h, 'rotations', 0, 10).listen();//.step(1);


        const h = dat.GUIVR.createX("Echoes");
        // highlightTime: { value: 1 },
        // highlightStrength: { value: 0.4 },
        // highlightStripes: { value: 10 },
        // highlightShape: { value: 0.1 },
        // h.add(u.highlightTime, 'value', ) // animation parameters...
        h.add(u.highlightStripes, 'value', 1, 10).step(1).listen().name("Number of echoes");
        h.add(u.highlightStrength, 'value', 0, 1).listen().name("Echo strength"); // vs selection strength...
        h.add(u.highlightShape, 'value', 0, 1).listen().name("Echo shape");
        gui.addFolder(h);


        const f = dat.GUIVR.createX("Motion");

        const v = u.travelDir.value;
        f.add(v, 'x', -1000, 1000).listen();
        f.add(v, 'y', -1000, 1000).listen();
        f.add(v, 'z', -1000, 1000).listen();

        gui.addFolder(f);

        return gui;
    }
}

// to turn on/off and dynamically (and get over temporary errors) toggle true below
// CSynth.HistoryTrace.vertcol = true;; badshader = 0; CSynth.newht()
CSynth.HistoryTrace.vertcol = false;


CSynth.newht = function() {
    const r = GX.saveguiString();
    V.gui.remove(GX.folders().HistoryTrace);
    VH.hist = new CSynth.HistoryTrace();
    V.gui.addFolder(VH.hist.createGUIVR());
    GX.restoreGuiFromObject(r);

}

// change resolution for historytrace (largely replaced by newgeo())
// We want to be able to keep length of recorded history trace more separate from history trace geo resolution
CSynth.newhtres = function({histlen = springs.getHISTLEN(), histalongres = 1} = {}) {
    if (histlen !== springs.getHISTLEN()) springs.setHISTLEN(histlen);
    V.rawscene.historytrace.children[0].geometry = HW.planeg(1,1, histlen, (numInstances * histalongres) - 1); // numsegs
}

/** set up history trace in Organic (eg tadpoles) context */
function OrganicHistoryTrace() {
            if (springs.getHISTLEN() === 0) springs.setHISTLEN(32);

            adduniform('killrads', new Array(WA.KILLRADLEN).fill(-999), 'fv');
            adduniform('numSegs', numInstances-1, 'f');
            adduniform('scaleFactor', 1, 'f');

            addgene('killradwidth', 0, 0, 20, 1, 1, 'numer of particles to kill each side of killrad points', 'geom', 1);
            addgene('ribbonStart', 0, 0,1, 0.001,0.001, 'start of ribbon, range 0..1 for full data');
            addgene('ribbonEnd', 1, 0,1, 0.001,0.001, 'end of ribbon, range 0..1 for full data');
            addgeneperm("cubicCatS", 0.5, 0, 1, 0.1, 0.01, "CatMull-Rom s factor", "springs", "frozen");


            // addgene('scaleFactor', 30., 1., 100., 0.01, 0.01, 'scaling factor for 3d ribbon etc', 'geom', 1);

            const hist = VH.hist = new CSynth.HistoryTrace();  // ??? 1/4
            hist.sheet.visible = true;
            // for very basic test, not for tadpoles
            if (tad.TADS) {
                G.ribbonEnd = tad.TADS * tad.RIBS/numInstances;
            } else {
                inps.doAnim = true;
                inps.animSpeed = 1;
            }

            const u = VH.hist.sheet.children[0].material.uniforms;
            u.particleWidth.value = 0.04;
            u.saturation.value = 1;
            u.opacity.value = 0.06;
            u.fadeFactor.value = 1.5
            u.highlightStrength.value = 0;
            runkeys('K,V,B');
            // tad.topos();

            if (!V.gui) V.gui = dat.GUIVR.createX("forhistorytrace");
            V.gui.addFolder(VH.hist.createGUIVR());
}


/*
comment on blending.
(1) The way we were doing additive blending meant that it was equivalent to modify brightness or opacity;
it was the product of the two that mattered.

(2) What three.js calls subtractive blending is actually multiplies dest (old framebuffer) value with 1-src (code) value.
This behaves OK, but ignores alpha.
Actually multiplication is better than subtraction as it asymptotes sensibly to black.

By folding alpha into brightness this 'subtractive' blending behaves as I think we want,
including for fade and saturation.
WRONG sjpt - 16/04/2020 There is no need to have special case for colMult, 
WRONG sjpt - 16/04/2020 as folding alpha in also works in additive blending on black as in (1) above.

(3) brightness/opacity values need to be higher when things are on white
as small deviations from white are perceptually smaller than small deviations from black.
I haven't made any changes to do anything automatic for this.

(4) Also no particular need to have both brightness and opacity sliders, but I haven't changed that for now.
*/
