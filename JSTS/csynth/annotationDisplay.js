///// ---- making a start at ts class implementation ---
class CSynthAnnotation {
    constructor(text, iOrAnnot, g = CSynth.annotationGroup) {
    }
}
CSynthAnnotation.nextGroupID = 0;
///// ---------------------------------------------------
(function () {
    const flatten = arr => arr.reduce((a, b) => a.concat(b), []); //nb, there is Array.prototype.flat()
    CSynth.createBEDAnnotation = function (annot) {
        const text = annot["Associated Gene Name"];
        return CSynth.createAnnotation(text, annot);
    };
    CSynth.SpringyAnnotations = false;
    let nextGroupID = 0;
    CSynth.addAnnotationGenes = function () {
        if (!W.uniforms.textScale) {
            addgeneperm("textScale", 0.2, 0, 0.2, 0.01, 0.001, "text scale", "text", "frozen");
            addgeneperm("textForward", 20, 0, 100, 10, 1, "text z shift to help see", "text", "frozen");
            addgeneperm("selWidth", 0.05, 0.0, 1, 0.1, 0.01, "shrink annotations far from (pre)selection", "text", "frozen");
            addgeneperm("minTextScale", 0, 0, 1, 0.1, 0.01, "minimum size that de-selected annotations will shrink to.", "text", "frozen");
        }
    };
    //TODO refactor so not everything is inside this function... consider sensible classes.
    CSynth.createAnnotation = function (text, iOrAnnot, g = CSynth.annotationGroup) {
        if (!text)
            return;
        let i, range;
        if (typeof iOrAnnot === 'number') {
            i = iOrAnnot;
            range = [i, i, i];
        }
        else {
            i = iOrAnnot.midI;
            const r = 1; // change for getPick() rerange (numInstances-1) / numInstancesP2;
            range = [i * r, iOrAnnot.minI * r, iOrAnnot.maxI * r];
        }
        //TODO: different annotation groups, pass in group as argument (nb 2020, not such a stale comment? logic for !g - ?)
        //would be more logical & useful for each annotation to have its own color but for now this is simpler to tie into gui.
        if (g)
            g.color = CSynth.annotationGroup ? CSynth.annotationGroup.color : new THREE.Color(1, 1, 1);
        if (!g) {
            g = CSynth.annotationGroup = new THREE.Group();
            g.color = CSynth.annotationGroup.color || new THREE.Color(1, 1, 1); //ugh
            g.name = 'annotationGroup' + nextGroupID++;
            g.visible = !CSynthFast;
            V.rawscene.add(g);
            //this function is called by init SpringsB
            let setupSpringPasses = function setupSpringPasses(originalIndices, linkData) {
                // add a pass to get source particle positions every frame (after main spring simulation, before ours)
                // we need to render into g.springs.posnewvals, from springs.posnewvals
                // output vertex is buffer coordinate derived from destIndex attribute
                const posCopyVert = /*glsl*/ `
                    ${CSynth.CommonShaderCode()}
                    uniform float destWorkHistTime;
                    uniform bool isInit;
                    attribute vec2 clipPos;
                    attribute float sourceIndex; //index of source particle in main spring model
                    attribute vec3 sourceRange; //for selection test
                    attribute float destIndex;   //index of output in annotation spring model
                    attribute vec3 initJitter;

                    varying vec4 posData;        //computed position of particle

                    void main() {
                        gl_Position.xy = clipPos;
                        //may still need to be further adjusted.
                        gl_Position.x += (2.*(destWorkHistTime - (1./8.)));
                        gl_Position.y += destIndex*2.;
                        gl_Position.z = 0.;
                        gl_Position.w = 1.0;

                        //XXX: this was originally supposed to be only on isInit, but now applied more widely
                        //TODO: change the initial pass, use Points rather than Mesh, make clipPos redundant etc.
                        //not doing this causes horrible jitter etc at the moment...
                        gl_Position.x = clipPos.x == -1. ? -1. : 1.;

                        posData = partpos(sourceIndex); //world matrix transformation here, or later? (later, in text render)
                        //TODO: use posData.w to pass 'selectedness' information for use in simulation.
                        posData.w = 1.0;
                        if (isInit) {
                            //slightly randomise position so that coincident points don't get stuck on top of eachother??
                            posData.xyz += initJitter;
                        }


                        //(also, we may want to sample a number of points in sourceRange and do something more sophisticated...
                        //like ~take the point closest to centroid?)
                    }
                `;
                const posCopyFrag = /*glsl*/ `
                    precision highp float;
                    varying vec4 posData;
                    void main() {
                        gl_FragColor = posData;
                    }
                `;
                const n = originalIndices.length;
                const posCopyUniforms = {
                    posNewvals: W.uniforms.posNewvals,
                    numInstancesP2: W.uniforms.numInstancesP2,
                    destInstancesP2: { type: 'f', value: g.springs.numInstancesP2 },
                    destWorkHistTime: g.springs.uniforms.workhisttime,
                    isInit: { type: 'b', value: true }
                };
                const dInstP2 = g.springs.numInstancesP2;
                const posCopyMaterial = new THREE.RawShaderMaterial({
                    vertexShader: posCopyVert, fragmentShader: posCopyFrag, uniforms: posCopyUniforms,
                    depthTest: false, depthWrite: false,
                    side: THREE.DoubleSide //could easily have wrong winding order...
                });
                const posCopyGeom = new THREE.BufferGeometry();
                //sounds almost musical.  but no.  trying to make quads instead of points.
                const flat4 = arr => arr.reduce((a, b) => a.concat(flatten([b, b, b, b])), []);
                const sourceIndex = new Float32Array(flat4(originalIndices));
                const sourceRange = new Float32Array(flat4(linkData.map(d => d.r)));
                const initJitter = new Float32Array(flat4(linkData.map(d => d.initJitter)));
                const indices = linkData.map((d, ii) => ii);
                const geoIndex = new Uint16Array(flatten(indices.map(ii => {
                    const j = ii * 4;
                    return [j, j + 1, j + 2, j + 2, j + 3, j + 1];
                })));
                const destIndexInit = new Float32Array(flat4(indices.map(ii => (ii + n) / dInstP2))); //to initialise annotation positions
                const destIndex = new Float32Array(flat4(indices.map(ii => ii / dInstP2))); //for general use to update source position
                //hope to be able to use Points & purely base gl_Position on destIndex & destWorkHistTime
                const clipPos = new Float32Array(flatten(indices.map(ii => {
                    const dy = 2 / dInstP2; //height of one cell in clip space
                    //give all clipPos same coordinates, then use destIndex in shader to translate.
                    const dx = 2 / g.springs.posWorkhist.width;
                    //XXX: note that currently clipPos.x is mangled by shader anyway...
                    const x0 = -1, x1 = -1 + dx, y0 = -1, y1 = -1 + dy;
                    return [x0, y0, x1, y0, x0, y1, x1, y1];
                })));
                posCopyGeom.setIndex(new THREE.BufferAttribute(geoIndex, 1));
                posCopyGeom.setAttribute('clipPos', new THREE.BufferAttribute(clipPos, 2));
                posCopyGeom.setAttribute('sourceIndex', new THREE.BufferAttribute(sourceIndex, 1));
                posCopyGeom.setAttribute('sourceRange', new THREE.BufferAttribute(sourceRange, 3));
                posCopyGeom.setAttribute('initJitter', new THREE.BufferAttribute(initJitter, 3));
                posCopyGeom.setAttribute('destIndex', new THREE.BufferAttribute(destIndexInit, 1));
                const posCopyMesh = new THREE.Mesh(posCopyGeom, posCopyMaterial);
                posCopyMesh.frustumCulled = false;
                const posCopyScene = new THREE.Scene();
                posCopyScene.add(posCopyMesh);
                //try to write data from sourceIndex to both destIndexInit & destIndex
                rrender('annotationsInitPosCopy', posCopyScene, camera, g.springs.posNewvals, false);
                //posCopyGeom.attributes.destIndex.array = destIndex;
                const destIndAttrib = posCopyGeom.attributes.destIndex;
                destIndAttrib.array = destIndex;
                destIndAttrib.needsUpdate = true;
                //posCopyGeom.attributes.destIndex.needsUpdate = true;
                rrender('annotationsInitPosCopy', posCopyScene, camera, g.springs.posNewvals, false);
                posCopyUniforms.isInit.value = false;
                g.springs.settleHistory();
                const linkMesh = new ForceVis(g.springs).annotationLinkQuads(linkData, uniforms);
                if (g.linkMesh)
                    g.remove(g.linkMesh);
                g.linkMesh = linkMesh;
                g.add(linkMesh);
                //TODO there may be circumstances where we want this to update while main springs are paused...
                //XXX TODO: don't keep accumulating these for every annotation group...
                springs.onPostSpringStep(() => {
                    //XXX: still not right logic... but should actually stop running irrelevant steps
                    //(won't allow garbage collection though)
                    if (!g.visible || !g === CSynth.annotationGroup)
                        return;
                    const sopmode = opmode;
                    //TODO: check order of writing into buffer, maybe rearrange these steps.
                    //this might be causing link geometry jitter (alternate positions on different frames)
                    // //glColorMask to prevent w being overwritten?
                    g.springs.step(1);
                    rrender('annotationPosCopy', posCopyScene, camera, g.springs.posWorkhist, false);
                    opmode = sopmode;
                });
            };
            g.initSprings = (len = 1, str = 1, pow = 1, fgui) => {
                if (g.springs) {
                    //todo: cleaner ways of dealing with this... !!!
                    springs.postSpringStepFns = [];
                }
                g.springs = new Springs(g.name);
                const annotations = g.userData.unmergedAnnotations || g.children; //we always expect unmergedAnnotations to be there, unless experimenting.
                g.children = [];
                annotations.forEach(a => g.add(a));
                //so we can rerun tests more reliably (although, pending testing this bit...)
                annotations.forEach(a => {
                    //need to do this for all children as well. possible that bugs were introduced when refactoring.
                    //Does assume that all children of 'a' will be meshes with relevant attribs.
                    a.children.forEach(c => {
                        let attribs = c.geometry.attributes; // *don't* getAttributes() instead, at least not at time of writing.
                        if (!c.userData.saveIndices) {
                            c.userData.saveIndices = attribs.particleIndex.array;
                            c.userData.saveRanges = attribs.particleRange.array;
                        }
                        else {
                            attribs.particleIndex.array = c.userData.saveIndices;
                            attribs.particleRange.array = c.userData.saveRanges;
                        }
                    });
                });
                g.createDebugGUI = () => {
                    let f = WA._annotationDebugGUI; //TODO: clean up...
                    if (f) {
                        f.remove(...f.guiChildren);
                    }
                    else {
                        f = WA._annotationDebugGUI = dat.GUIVR.create("annotations debug");
                        V.gui.addFolder(f);
                        //f.detach();
                    }
                    Object.entries(g.springs.uniforms).forEach(e => {
                        const name = e[0], u = e[1];
                        if (u.min === undefined)
                            return;
                        const gui = f.add(u, 'value', u.min, u.max).listen().name(name).step((u.max - u.min) / 100);
                        gui.setToolTip(u.help);
                    });
                    // f.addImageButton(x=>x, g.springs.posWorkhist.texture, true);
                    // //f.addImageButton(x=>x, g.springs.uniforms.distbuff.value, true);
                    // f.addImageButton(x=>x, g.springs.posHist.texture, true);
                };
                const n = annotations.length * 2;
                g.springs.setPARTICLES(n);
                //maybe we'd prefer to pass in an options object to constructor for configuring springs?
                //g.springs.setHISTLEN(0); //actually, maybe history of these could be fun&interesting
                //g.springs.setMAX_DEFS_PER_PARTICLE(8); //this is done by default
                g.springs.setup();
                //g.springs.initdistbuff();
                //should there be a more obvious way of asking g.springs for these?
                //what uniforms do I need to change in order to properly use g.springs?
                //transforms should be the same. Reading through what partposWorld / pposToWorld need.
                //scaleFactor, scaleDampTarget, modelMatrix - should be ok as was.
                uniforms.posNewvals = { type: 't', value: g.springs.posNewvals.texture };
                uniforms.numInstancesP2 = { type: 'f', value: g.springs.numInstancesP2 };
                uniforms.numSegs = { type: 'f', value: g.springs.numInstances };
                //establish some sensible defaults for tweakable values:
                //things to consider:
                //  * Number of annotations, number of particles, and how they relate.
                //  * geometry stats of model (in volume)
                //const volume = CSynth.stats(); // we can also pass g.springs.getpos() as argument.
                //{centroid: vec3, eigenvalues: [3], min/max: vec3, radii: [3], volume: number}
                // pre 3/8/2020
                // g.springs.uniforms.damp.value = 0.8;
                // g.springs.uniforms.noiseprob.value = 0;
                // g.springs.uniforms.pushapartforce.value = 0.1/(n*n);
                // g.springs.uniforms.pushapartpow.value = -2;
                // //g.springs.uniforms.pushapartdelta.value = 0.65;
                // g.springs.uniforms.powBaseDist.value = 20;
                // 3/8/2020
                g.springs.uniforms.damp.value = 0.9;
                g.springs.uniforms.noiseprob.value = 0;
                g.springs.uniforms.pushapartforce.value = 2;
                g.springs.uniforms.pushapartpow.value = 0;
                g.springs.uniforms.springlen.value = 0;
                g.springs.uniforms.springforce.value = 1;
                if (fgui) { // at least have spring strength in the gui
                    const u = g.springs.uniforms;
                    // let _spread = 0;
                    const o = {
                        get spread() {
                            const k = u.springforce.value + u.pushapartforce.value;
                            return u.pushapartforce.value / k;
                        },
                        set spread(val) {
                            const k = u.springforce.value + u.pushapartforce.value;
                            u.springforce.value = k * (1 - val);
                            u.pushapartforce.value = k * val;
                        }
                    };
                    u.springforce.value = 1;
                    u.pushapartforce.value = 0;
                    o.spread = 0.4;
                    fgui.add(o, 'spread', 0, 0.95).listen().name('spread').step(0.01) // -0.22
                        .setToolTip('bring annotation closer or further out');
                    // fgui.add(u.springlen, 'value', 0, 20).listen().name('springlen').step(0.01);
                    // fgui.add(u.pushapartforce, 'value', 0, 10).listen().name('pushapartforce').step(0.01);
                    // const gui = fgui.add(u.springforce, 'value', 0, 2).listen().name('springforce').step(0.01);
                }
                let nextIndex = annotations.length;
                const linkData = annotations.map((annot, li) => {
                    const oldV = annot.annotParticleIndex;
                    const oldI = Math.floor(oldV * g.springs.numInstancesP2);
                    const annotj = nextIndex++;
                    //maybe it'd be better to write into distbuff?
                    const slot = g.springs.setslot(annotj, li, len, str, pow);
                    //let slot = g.springs.setDistSpring(annotj, li, len);
                    if (slot === undefined)
                        log(`bad annotation spring v=${oldV} part=${li} annot=${annotj}`);
                    const jNorm = annotj / g.springs.numInstancesP2;
                    const iNorm = li / g.springs.numInstancesP2;
                    /// refactoring to update each of the children (background, ... links come later) as well as text.
                    // need to consider how to extract 'r' for returning: similar for each child.
                    let r; //simplest for now...
                    annot.children.forEach(c => {
                        const attribs = c.geometry.attributes;
                        attribs.particleIndex.array.fill(jNorm);
                        //particleRange used for selection visualisation needs to have factor f applied to renormalise
                        // unclear why we need -1 only in denominator??
                        // WAS before pick rerange const f = (n/g.springs.numInstancesP2) / ((springs.numInstances-1)/springs.numInstancesP2);
                        const f = n / g.springs.numInstances; // removed with renorm of pick / ((springs.numInstances-1)/springs.numInstancesP2);
                        const R = attribs.particleRange.array;
                        r = [R[0] * f, R[1] * f, R[2] * f];
                        attribs.particleRange.array = R.map((v, ii) => r[ii % 3]);
                        attribs.particleRange.needsUpdate = true;
                    });
                    const rnd = () => -0.5e-2 + 1e-2 * Math.random();
                    const jit = [rnd(), rnd(), rnd()];
                    return { i1: iNorm, i2: jNorm, r: r, initJitter: jit };
                });
                //might not be unique, but the point of making them unique before was when operating on merged geometry
                //with lots of redundant information, attempting to reconstitute essentially this information.
                const originalIndices = annotations.map(a => a.annotParticleIndex);
                CSynth.consolidateTextBuffers(g);
                setupSpringPasses(originalIndices, linkData);
            };
            /** Filter visible annotations by a search string.
             * Partial implementation, plays badly with springs etc.
             * Needn't only apply to text, could be overall BED filter.
             */
            g.filter = (textFilter) => {
                g.userData.textFilter = textFilter;
                //restore originals if re-filtering (sloppy code, hope to clean up...)
                if (g.userData.unfilteredAnnotations)
                    g.userData.unmergedAnnotations = g.userData.unfilteredAnnotations;
                const annotations = g.userData.unmergedAnnotations;
                g.userData.unfilteredAnnotations = annotations;
                g.userData.unmergedAnnotations = annotations.filter(a => a.text.match(textFilter));
                CSynth.consolidateTextBuffers(g);
            };
        }
        if (typeof text !== 'string')
            text += '';
        const group = dat.GUIVR.textCreator.create(text); //we might want to pass in a more structured object with different fields etc.
        group.text = text;
        group.name = 'agrouptext:' + text;
        const mesh = group.children[0]; // peek inside their mesh implementation
        mesh.text = text;
        mesh.name = 'agroupch0text:' + text;
        mesh.geometry.text = text;
        g.add(group);
        mesh.frustumCulled = false; // their calculate of where we are is not appropriate (??? may be after 2 Aug ???)
        CSynth.annotmesh = group.children[0]; // just save the last one, for debug
        // reset the scale and position so the viewMatrix gives sensible answers for particle positions
        // needed because we have custom shader to lookup spring etc, we don't want their text scaling to confuse our positions
        // the custome shader also handles scale and orientation of the text
        mesh.matrix.identity();
        mesh.matrixAutoUpdate = false;
        mesh.matrixWorldNeedsUpdate = true;
        //TODO review (/ kill) ...
        group.initSpring = (parent = g) => { };
        group.annotParticleIndex = i * (numInstances - 1) / numInstancesP2;
        var vertpre2 = '', fragpre2 = '';
        if (isWebGL2) {
            vertpre2 += "precision highp float;\n";
            vertpre2 += "#define attribute in\n";
            vertpre2 += "#define varying out\n";
            vertpre2 += "#define texture2D texture\n";
            fragpre2 += "precision highp float;\n";
            fragpre2 += "#define attribute in\n";
            fragpre2 += "#define varying in\n";
            fragpre2 += "#define texture2D texture\n";
            fragpre2 += "#define gl_FragColor glFragColor\n";
            fragpre2 += "out vec4 glFragColor;\n";
        }
        //a new version of the shader that knows about spring positions etc.
        //also aware of (pre)selection etc.
        //annotation visibility should possibly taper along with ribbon radius.
        const vertexShader = /*glsl*/ `
            // annotation display vertex
            // #extension EXT_color_buffer_float : enable
            ${vertpre2}
            ${CSynth.CommonShaderCode()}
            ${inputs.U360 ? '#define U360' : ''}
            attribute float particleIndex; // index of particle used for transform
            attribute vec3 particleRange; // {mid, min, max} of range of particles used for selection
            uniform float textScale;
            uniform float textForward;
            uniform float selWidth;
            uniform float minTextScale;
            varying vec2 vUv;
            varying float vParticleIndex;
            varying vec3 vParticleRange;
            varying float selAlpha;

            float computeScale() {
                float s = minTextScale;
                for (int i=0; i<PICKNUM; i++) {
                    //SKIP_PICK yuck //TODO change the way SKIP_PICK works, vertex shader doesn't like 'continue'
                    //range in pickrt buffer doesn't match getPick() if we have annotation springs.
                    //we compensate for this by applying an appropriate factor to particleRange attribute
                    float p = getPick(i);
                    if (p > 99.9) continue;
                    vec3 r = particleRange;
                    //are we within the range, or how far above or below it?
                    float dp;
                    bool inRange = r.y < p && r.z > p;
                    if (inRange) {
                        dp = 0.;
                    } else {
                        vec3 dr = abs(particleRange - p);
                        dr = abs(dr);
                        dp = min(dr.y, dr.z);
                        //dp = min(abs(r.y-p), abs(r.z-p));
                    }
                    //dp = abs(r.x - p); //this was just looking at centre.


                    float sw = selWidth + 1e-10;
                    float inv = 1./sw;
                    float s2 = dp <= sw ? 1.-(dp*inv) : 0.;
                    s2 = VALID_PICK_INDEX ? s2 : 0.;
                    //s2 *= 10.;
                    s = max(s, s2);
                }
                selAlpha = s;
                s *= textScale;
                return s;
            }

            void main() {
                vUv = uv;
                vParticleIndex = particleIndex;
                vParticleRange = particleRange;
                vec4 pos = partposWorld(particleIndex);  // partposWorld used to use rot4, now applies modelMatrix

                //compute scale s based on 'selected-nes'.
                float s = computeScale();

                //Spread out the text so it always faces camera
                //position is standard position attribute, in this case of glyphs.
                //adding position.xy pre or post view transform should allow us to
                //mix how strongly to force camera facing (eg, not at all in VR)...
                //For some reason seem to be getting same result regardless of pre/post???
                vec4 spos = pos;
                spos.x += position.x*s;
                spos.y -= position.y*s;
                spos = viewMatrix * spos;

                vec4 vpos = viewMatrix * pos;
                vpos.x += position.x*s;
                vpos.y -= position.y*s;
                vpos.w = 1.;

                pos = vpos; //mix(spos, vpos, 0.5);
                pos.z += textForward;
                pos.z += position.z;
                //pos.w = 1.;

                // NO, this uses the matrix from the text mesh,
                // which scales down the positions as well as scaling down the text
                // gl_Position = projectionMatrix * modelViewMatrix * pos;
                //TODO review / logdepth
                #ifndef U360
                    gl_Position = projectionMatrix  * pos;
                #else
                    // taken from threek.js
                    // this does NOT yet include poskey to prevent wraparound issues
                    float x = pos.x, y = pos.y, z = pos.z; // extract x,y,z for easy reading
                    float w = projectionMatrix[0][0], h = projectionMatrix[1][1];
                    vec4 ooo;
                    ooo.x = atan(z, x) / 3.14159;
                    ooo.y = atan(y, sqrt(x*x + z*z)) * 2. / 3.14159;
                    ooo.z = sqrt(x*x + y*y + z*z) / 5000.0; // temp
                    ooo.w = 1.;
                    gl_Position = ooo;
                #endif
            }
        `;
        // at time of writing, no different to standard SDF fragmentShader
        // but we might want to modify color based on (pre)selection etc.
        const textFragmentShader = /*glsl*/ `
            ${fragpre2}
            // annotation display fragment
            #ifdef GL_OES_standard_derivatives
            #extension GL_OES_standard_derivatives : enable
            #endif
            // #extension EXT_color_buffer_float : enable
            precision highp float;
            uniform float opacity;
            uniform vec3 color;
            uniform sampler2D map;
            //uniform float particleIndex;
            varying vec2 vUv;
            varying float selAlpha;
            float aastep(float value) {
                //TODO: adapt shader (particularly as used in GUI) to correct for gamma.
        // the second choice here didn't work sensibly
        // GL_OES_standard_derivatives not defined in webgl2,
        // so just hope the first version will be available
       //         #ifdef GL_OES_standard_derivatives
                    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
       //         #else
       //             float afwidth = (1.0 / 32.0) * (1.4142135623730951 / (2.0 * gl_FragCoord.w));
       //         #endif
                return smoothstep(0.5 - afwidth, 0.5 + afwidth, value);
            }
            void main() {
                vec4 texColor = texture2D(map, vUv);
                float alpha = aastep(texColor.a);
                //TODO fade out text towards ends; first experiment was promising
                //(if revisiting, need to use particleRange attribute instead)
                //alpha *= sin(particleIndex*2.*3.14159);
                gl_FragColor = vec4(color, opacity * alpha * selAlpha);
                if (gl_FragColor.a < 0.0001) discard;

                //// attempting to set contrasting background color like this will not work
                //// as letters overlap and obscure each-other.
                // vec3 backgroundColor = 1. - color;
                // gl_FragColor.rgb = mix(backgroundColor, color, alpha);
                // gl_FragColor.a = opacity * selAlpha;
            }
        `;
        const uniforms = group.userData.uniforms || {};
        group.userData.uniforms = uniforms;
        function addParticleAttributes(geometry) {
            const particleIndex = new Float32Array(geometry.attributes.position.count);
            particleIndex.fill(group.annotParticleIndex);
            geometry.setAttribute('particleIndex', new THREE.BufferAttribute(particleIndex, 1));
            //this can be consolidated with above in vec4
            const n = geometry.attributes.position.count * 3;
            const particleRange = new Float32Array(n);
            //particleRange.fill(group.annotParticleIndex);
            for (let j = 0; j < n; j += 3) {
                particleRange.set(range, j);
            }
            geometry.setAttribute('particleRange', new THREE.BufferAttribute(particleRange, 3));
        }
        function replaceTextVertexShader(threeObj) {
            function setupUniforms() {
                const oldMat = threeObj.material; //oldMat.uniforms.color will be a unique reference to a default white.
                copyFrom(uniforms, oldMat.uniforms);
                //.... clone? some things do *not* want totally common reference, in particular "color".
                copyFrom(uniforms, CSynth.getCommonUniforms());
                // logically, there could be multiple annotation groups with their own color.
                // for now, all anotations are assumed to have the same color, which should not be shared with other text (ie, on the gui menus).
                uniforms.color = { type: "c", value: g.color };
                CSynth.addAnnotationGenes();
                uniforms.textScale = W.uniforms.textScale;
                uniforms.textForward = W.uniforms.textForward;
                uniforms.selWidth = W.uniforms.selWidth;
                uniforms.minTextScale = W.uniforms.minTextScale;
                WA.uuulist[i] = uniforms; //XXX
            }
            setupUniforms();
            const geometry = group.children[0].geometry;
            addParticleAttributes(geometry);
            //TODO: update to use ShaderMaterial with new version supporting logdepth.
            //rather than using all new shader code, could try to add an onBeforeCompile to inject vertex code as needed.
            const newMat = new THREE.RawShaderMaterial({
                vertexShader: vertexShader, fragmentShader: textFragmentShader, uniforms: uniforms, transparent: !CSynthFast,
                depthTest: true, name: 'annotationDisplayMaterial'
            });
            if (isWebGL2)
                newMat.glslVersion = THREE.GLSL3;
            threeObj.material = newMat;
        }
        function addBackground() {
            //const w = group.computeWidth(), h = group.computeHeight();
            const padding = 120;
            const w = group.layout.width, h = group.layout.height;
            const geo = HW.planeg(w + padding, h + padding, 1, 1);
            const translate = new THREE.Matrix4();
            translate.setPosition(w / 2, -h / 2 + padding / 8, -2);
            geo.applyMatrix4(translate);
            addParticleAttributes(geo);
            //this might be wrong UVs, maybe not using now but could be useful for outline etc. & need vertex attrib anyway
            geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
            //should be compatible with vertexShader used for text.
            //May be worth having a different vertex shader though for padding, adding bedColor without incurring cost in text...
            const backFragmentShader = /*glsl*/ `
            ${fragpre2}
                // annotation display background fragment
                ${CSynth.CommonFragmentShaderCode()}
                precision highp float;
                uniform float opacity;
                uniform vec3 color;
                varying vec2 vUv;
                varying float vParticleIndex;
                varying vec3 vParticleRange;
                varying float selAlpha;
                void main() {
                    //vec3 c = vec3(0.5); //for now, sharing uniforms with text & hoping for best...
                    vec3 borderColor = bedColor(vParticleRange.x); //could probably be cheaper in vertex.
                    float b = 1. - smoothstep(0.05, 0.08, vUv.y); // could do with some more control over this.
                    borderColor *= b;
                    gl_FragColor = vec4(mix((1. - color), borderColor, b), opacity * selAlpha * mix(0.8, 1., b));
                    if (gl_FragColor.a < 0.0001) discard;
                }
            `;
            const mat = new THREE.RawShaderMaterial({
                vertexShader: vertexShader, fragmentShader: backFragmentShader, uniforms: uniforms, transparent: !CSynthFast,
                depthTest: true, name: 'annotationBackgroundMaterial', side: THREE.DoubleSide
            });
            if (isWebGL2)
                mat.glslVersion = THREE.GLSL3;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.frustumCulled = false;
            group.add(mesh);
        }
        replaceTextVertexShader(group.children[0]);
        addBackground();
        //beware updateLabel in cases where buffers are consolidated... we don't (yet) deal with that
        group.updateAnnotation = (atext, ai) => {
            //TODO: log a warning... or just fix this...
            group.updateLabel('' + atext);
            group.annotParticleIndex = ai;
            //TODO: clean OO layer around all this stuff...
            group.children.forEach(c => {
                const attributes = c.geometry.attributes;
                //if it so happens that we're inside a consolidated buffer, we should really rebuild the whole thing.
                const n = attributes.position.count;
                let arr = new Float32Array(n);
                arr.fill(ai);
                c.geometry.setAttribute('particleIndex', new THREE.BufferAttribute(arr, 1));
                // let attrib = attributes.particleIndex;  // for old three.js revision
                // attrib.setArray(arr);
                // attrib.needsUpdate = true;
                arr = new Float32Array(n * 3);
                arr.fill(ai);
                c.geometry.setAttribute('particleRange', new THREE.BufferAttribute(arr, 3));
                // attrib = attributes.particleRange;
                // attrib.setArray(arr);
                // attrib.needsUpdate = true;
            });
            group.visible = true;
        };
        return group;
    };
})();
WA.uuulist = {};
/** make sure position has 3d coords else later version of three break */
CSynth.geometry23d = function (geometry) {
    var _a;
    const pos = geometry.attributes.position;
    if (!pos) {
        log('geometry no position attribute');
        return;
    }
    const isize = pos.itemSize;
    if (isize === 3)
        return;
    if (isize !== 2) {
        console.error('cannot make geometry 3d, unexpected position attribute', isize);
        return;
    }
    const oa = pos.array;
    const na = new oa.constructor(oa.length * 3 / 2);
    let j = 0;
    for (let i = 0; i < oa.length; i += 2) {
        na[j++] = oa[i];
        na[j++] = oa[i + 1];
        na[j++] = 0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(na, 3));
    log('geometry corrected from 2d to 3d position', (_a = geometry.name) !== null && _a !== void 0 ? _a : 'unnamed');
};
CSynth.consolidateTextBuffers = (group = CSynth.annotationGroup) => {
    //are we reprocessing (after altering for springs?)
    const unmerged = group.userData.unmergedAnnotations || group.children;
    // mapping over [0,1] on the assumption that 0 will be text and 1 will be background.
    // something cleaner would be good, also including spring links.
    const keys = [0, 1]; // unmerged[0].children.keys()
    const mergedMeshes = keys.map(i => {
        const geometries = unmerged.map(c => c.children[i].geometry);
        const geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        CSynth.geometry23d(geometry); // patch geometry in place
        const mat = unmerged[0].children[i].material;
        const mergedMesh = new THREE.Mesh(geometry, mat);
        // mergedMesh.frustumCulled = false; // no need now we have proper 3d position
        mergedMesh.name = 'merged annotation display';
        return mergedMesh;
    });
    group.userData.unmergedAnnotations = unmerged;
    group.children = []; //mergedMeshes; //assigning array directly seems to result in matrix not being computed properly.
    //which lead me to adding saveGeometry hack etc.
    mergedMeshes.forEach(m => group.add(m));
    //handy for debugging.
    // unmerged.forEach(a => {
    //     var p = new Proxy(a.children, {
    //          set(target, property, value) {
    //              console.log(`Setting ${property} to ${value}`);
    //              return Reflect.set(target, property, value);
    //         }
    //     });
    //     a.children = p;
    // })
};
/*
help for debug, remove Nov 2020 TODO
ag = V.rawscene.children[7]
mm = ag.children[0]
mat = mm.material
mattex = mat.uniforms.map.value
GX.setValue(/textscale/, 2)
GX.setValue(/ribbon\/vis/, false)
GX.setValue(/matrix\/vis/, false)

 */ 
//# sourceMappingURL=annotationDisplay.js.map