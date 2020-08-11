/**
 * Drawing links between particles.
 */
class ForceVis {
    constructor(springs) {
        this.springs = springs;
        //what kind of geometry do I want (lines vs quads)?
        //what kind of links am I showing (how bad would it be to have n*n)?
        //I already do something in annotationDisplay... so concrete first step is to refactor that to here. ('annotationLinkLines')
    }
    topologySpringLines(uniforms) {
        // const topologyarr = this.springs.topologyarr;
        // const activeSprings = [];
        // for (let i=0; i<topologyarr.length; i+=4) {
        //     const v = topologyarr.slice(i, i+4);
        //     if (v.filter(x => x === -1).length !== 4) activeSprings.push({i: i, v: v});
        // }
        // console.log(activeSprings.length + " active springs");
        // const activeSprings = [];
        // for (let u=0; u<n; u++) {
        //     for (let v=0; v<n; v++) {
        //         const uvSprings = this.springs.showspring(u, v).filter(s => s !== undefined);
        //         activeSprings.push(...uvSprings);
        //     }
        // }
        // console.log(activeSprings.length + " active springs");
    }
    contactForceLines(uniforms) {
        const n = this.springs.numInstances;
        const p2 = this.springs.numInstancesP2;
        //find active springs from contacts and generate geometry.
        //TODO: make sure this keeps track of any changes... perhaps springs should generate an event.
        //(being careful not to respond to each spring individually when changing entire set...)
        //actually, another thing we ideally want is the pairforce() results in a buffer;
        //might refactor to allow doing this in a separate pass so we don't have to redo equivalent work in this shader.
        const contacts = this.springs.contacts;
        const activeSprings = [];
        for (let u = 0; u < n; u++) {
            for (let v = 0; v < n; v++) {
                const val = contacts.getab(u, v); //might be 0, some small float, -999...
                if (val > 0) {
                    activeSprings.push([u, v, val]);
                    activeSprings.push([v, u, val]);
                }
            }
        }
        console.log((activeSprings.length / 2) + " active springs");
        const n2 = activeSprings.length;
        const particleIndex = new Float32Array(activeSprings.length).map((v, i) => activeSprings[i][0] / p2);
        const oPart = new Float32Array(activeSprings.length).map((v, i) => activeSprings[i][1] / p2);
        const geoIndex = new Uint32Array(n2).map((v, i) => i); //duh
        const geometry = new THREE.BufferGeometry();
        geometry.addAttribute('particleIndex', new THREE.BufferAttribute(particleIndex, 1));
        geometry.addAttribute('oPart', new THREE.BufferAttribute(oPart, 1));
        geometry.setIndex(new THREE.BufferAttribute(geoIndex, 1));
        const linkVert = `
            ${CSynth.CommonShaderCode()}
            attribute float particleIndex;
            attribute float oPart;
            varying float d;
            void main() {
                vec4 pos = partposWorld(particleIndex);
                vec4 oPos = partposWorld(oPart);
                vec4 dp = pos-oPos;
                //float lenSq = dot(dp, dp)
                d = length(dp);
                //could maybe let user inject glsl functions which gets info about the two particles and decide whether to discard / how to color etc.
                //this could be
                //   based on selection range (eg, of rectangular annotation drawn on matrix, or maybe even 'painted' selection), maybe best outside shader though
                //   based on how far apart / how strong force is / etc.

                //can't discard vertices, but I could cause resulting geometry to be degenerate or out of range...
                //maybe do something different with w, or "pos += dp/2".
                pos.w = 1.;
                gl_Position = logdepth(projectionMatrix * viewMatrix * pos);
            }
        `;
        const linkFrag = `
            precision highp float;
            varying float d;
            void main() {
                if (d > 300.) discard; //more useful would be to look at force and visualise only strong forces.
                gl_FragColor = vec4(1.);
                gl_FragColor.a = 1. / d;
                //discard; //even with all fragments discarded, large models are slow.
            }
        `;
        const material = new THREE.RawShaderMaterial({
            vertexShader: linkVert, fragmentShader: linkFrag, uniforms,
            transparent: true, depthWrite: false
        });
        const linkMesh = new THREE.LineSegments(geometry, material);
        linkMesh.frustumCulled = false;
        return linkMesh;
    }
    capsidInteractions() {
    }
    nucleusInteractions() {
    }
    /**
     * This is a particular special case, designed to work with data generated internally in annotationDisplay.
     * Each element includes 'r' range info used for picking, which is normalised differently to the indices in i1 & i2
     * @param {*} linkData array of {i1, i2, r}
     * where i1/i2 are indices (normalised to g.springs range) and r (normalised to global springs range)
     * @param {*} uniforms
     */
    annotationLinkLines(linkData, uniforms) {
        // I want a version of this that makes better visuals
        // and I want to ?? abstract out the picking code and make the interface better ??
        // somehow the better visuals seem like they should take priority.
        const linkVert = `
            ${CSynth.CommonShaderCode()}
            //note: when using separate spring systems, particleIndex is annotation springs range
            //while particleRange, used for selection test, is in 'main' springs range
            attribute float particleIndex;
            attribute vec3 particleRange;
            uniform float minTextScale;
            uniform float selWidth;
            varying vec4 color;

            void main() {
                vec4 pos = partposWorld(particleIndex);
                pos.w = 1.;
                pos = viewMatrix * pos;
                gl_Position = logdepth(projectionMatrix * pos);

            //TODO:::: make this code common... (maybe use pos.w for selectedness)
                float s = minTextScale;
                for (int i=0; i<PICKNUM; i++) {
                    //SKIP_PICK //TODO change the way SKIP_PICK works, vertex shader doesn't like 'continue'
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
                        //dr.x is at time of writing distance of p to the point that this line points to
                        dp = min(dr.x, min(dr.y, dr.z));
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
                //TODO: color options.
                color.rgb = bedColor(particleRange.x);
                color.a = s*s*s;
            }
        `;
        const linkFrag = `
            precision highp float;
            varying vec4 color;
            void main() {
                gl_FragColor = color;
            }
        `;
        const geometry = new THREE.BufferGeometry();
        const flatten = arr => arr.reduce((a, b) => a.concat(b), []);
        const particleIndices = new Float32Array(flatten(linkData.map(d => [d.i1, d.i2])));
        const particleRanges = new Float32Array(flatten(linkData.map(d => d.r.concat(d.r))));
        const geoIndex = new Uint16Array(flatten(linkData.map((d, j) => [j * 2, j * 2 + 1])));
        geometry.addAttribute('particleIndex', new THREE.BufferAttribute(particleIndices, 1));
        geometry.addAttribute('particleRange', new THREE.BufferAttribute(particleRanges, 3));
        geometry.setIndex(new THREE.BufferAttribute(geoIndex, 1));
        geometry.name = 'annotationSpringLink geometry';
        const material = new THREE.RawShaderMaterial({
            vertexShader: linkVert, fragmentShader: linkFrag, uniforms: uniforms,
            transparent: true, depthWrite: false
        });
        // at some point I want to render these as mesh rather than lines.
        const linkMesh = new THREE.LineSegments(geometry, material);
        linkMesh.name = 'annotationSpringLink mesh';
        linkMesh.frustumCulled = false;
        this.linkMesh = linkMesh;
        return linkMesh;
    }
    annotationLinkQuads(linkData, uniforms) {
        // I want a version of this that makes better visuals
        // and I want to ?? abstract out the picking code and make the interface better ??
        // somehow the better visuals seem like they should take priority.
        const linkVert = `
            ${CSynth.CommonShaderCode()}
            //note: when using separate spring systems, particleIndex is annotation springs range
            //while particleRange, used for selection test, is in 'main' springs range
            attribute float particleIndex;
            attribute float adjacentParticleIndex;
            attribute vec3 particleRange;
            //attribute vec2 uv;
            uniform float minTextScale;
            uniform float selWidth;
            uniform float lineWidth;
            varying vec4 color;
            varying vec2 vUv;

            //TODO:::: make this code common... (maybe use pos.w for selectednes)
            float computeSelectednes() {
                float s = minTextScale;
                for (int i=0; i<PICKNUM; i++) {
                    //SKIP_PICK //TODO change the way SKIP_PICK works, vertex shader doesn't like 'continue'
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
                        //dr.x is at time of writing distance of p to the point that this line points to
                        dp = min(dr.x, min(dr.y, dr.z));
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
                return s;
            }

            void main() {
                float s = computeSelectednes();
                vec4 pos = partposWorld(particleIndex);
                pos.w = 1.;
                vec4 p2 = partposWorld(adjacentParticleIndex);
                p2.w = 1.;
                pos = viewMatrix * pos;
                p2 = viewMatrix * p2;
                vec2 dir = normalize(pos.xy - p2.xy) * 2.*(uv.y-0.5);
                dir = dir.yx * vec2(-1., 1.);
                pos.xy += s * dir * lineWidth * (uv.x - 0.5);
                //trying to stop horizontal line from squishing. pending working out properly without computing other end...
                //pos.y -= lineWidth*(uv.x - 0.5);
                vUv = uv;
                gl_Position = logdepth(projectionMatrix * pos);

                //TODO: color options.
                color.rgb = bedColor(particleRange.x);
                color.a = s*s*s;
            }
        `;
        const linkFrag = `
            precision highp float;
            varying vec4 color;
            varying vec2 vUv;
            void main() {
                gl_FragColor = color;
                gl_FragColor.a *= smoothstep(0., 0.5, 1. - abs(1.-2. * vUv.x));
            }
        `;
        const geometry = planeg(100, 100, linkData.length, 2);
        //const geometry = new THREE.BufferGeometry();
        const flatten = arr => arr.reduce((a, b) => a.concat(b), []);
        //const positions = new Float32Array( flatten( linkData.map(d => [0,0,0]) ) );
        const particleIndices = new Float32Array(flatten(linkData.map(d => [d.i1, d.i1, d.i2, d.i2])));
        const adjacentParticleIndices = new Float32Array(flatten(linkData.map(d => [d.i2, d.i2, d.i1, d.i1])));
        const particleRanges = new Float32Array(flatten(linkData.map(d => d.r.concat(d.r, d.r, d.r))));
        const geoIndex = new Uint16Array(flatten(linkData.map((d, i) => [0, 1, 2, 1, 2, 3].map(v => v + (i * 4)))));
        const UVs = new Float32Array(flatten(linkData.map(d => [0, 0, 1, 0, 0, 1, 1, 1])));
        geometry.addAttribute('particleIndex', new THREE.BufferAttribute(particleIndices, 1));
        geometry.addAttribute('adjacentParticleIndex', new THREE.BufferAttribute(adjacentParticleIndices, 1));
        geometry.addAttribute('particleRange', new THREE.BufferAttribute(particleRanges, 3));
        geometry.addAttribute('uv', new THREE.BufferAttribute(UVs, 2));
        geometry.setIndex(new THREE.BufferAttribute(geoIndex, 1));
        geometry.name = 'annotationSpringLink geometry';
        uniforms.lineWidth = { value: 5 };
        const material = new THREE.RawShaderMaterial({
            vertexShader: linkVert, fragmentShader: linkFrag, uniforms: uniforms,
            transparent: true, depthWrite: false, side: THREE.DoubleSide
        });
        ///// at some point I want to render these as mesh rather than lines.
        const linkMesh = new THREE.Mesh(geometry, material); // new THREE.LineSegments(geometry, material);
        linkMesh.name = 'annotationSpringLink mesh';
        linkMesh.frustumCulled = false;
        this.linkMesh = linkMesh;
        return linkMesh;
    }
}
//# sourceMappingURL=ForceVis.js.map