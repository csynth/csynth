"use strict";

var CSynth, THREE, V, VH, uniforms, log, CSynthFast, PICKNUM;
//TODO: consolidate any line rendering we do for annotations so as not to incur unnecessary draw calls.
CSynth.HornLaser = function() {
    const vert = `
        // HornLaser vert
        ${CSynth.CommonShaderCode()}
        //"attribute cannot be int" computer says no.
        //precision highp float;
        attribute float pickIndex;
        uniform float opacity;
        varying vec4 col;

        void main() {
            int i = int(pickIndex);
            float pi = getPick(i);
            vec4 pos = partposWorld(pi);
            col = vec4(getPickColor(i), opacity);
            gl_Position = logdepth(projectionMatrix * viewMatrix * pos);
        }
    `;

    const frag = `
        // HornLaser frag
        precision highp float;
        varying vec4 col;
        void main() {
            gl_FragColor = col;
        }
    `;

    const luniforms = CSynth.getCommonUniforms();
    luniforms.opacity = { value: 0.2 };

    const material = new THREE.RawShaderMaterial({
        vertexShader: vert, fragmentShader: frag,
        uniforms: luniforms, transparent: !CSynthFast, depthWrite: false
    });
    material.name = 'HornLaser';

    //doesn't need any color, position, normal etc information
    //just indices into pickrt to go from controller / cursor position
    //to corresponding picked point
    //and from one side of matrix pick to another.
    const geometry = new THREE.BufferGeometry();
    const pickIndices = new Float32Array([4, 5, 12, 13]); //yuck
    geometry.addAttribute('pickIndex', new THREE.BufferAttribute(pickIndices, 1));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 3]),1));

    this.threeObj = new THREE.LineSegments(geometry, material);
    geometry.name = 'selectionvis geometry';
    material.name = 'selectionvis material';
    this.threeObj.frustumCulled = false;
    this.threeObj.name = 'selectionvis threeobj';
    V.rawscene.add(this.threeObj);
};

CSynth.SelectionSpheres = function() {

    const vert = `
        // SelectionSpheres vertex
        ${CSynth.CommonShaderCode()}


        uniform int pickIndex;
        uniform float opacity;
        varying vec4 color;

        void main() {
            color = vec4(getPickColor(pickIndex), opacity);
            float pick = getPick(pickIndex);
            if (pick > 1.) color.a = 0.;
            vec4 p = partposWorld(pick * numSegs / numInstancesP2);
            p.xyz += position;
            p.w = 1.;
            gl_Position = logdepth(projectionMatrix * viewMatrix * p); // model part already in partposWSorld
        }
    `;

    const frag = `
        // SelectionSpheres fragment
        precision highp float;
        varying vec4 color;

        void main() {
            gl_FragColor = color;
        }
    `;

    const radius = 30;
    const rr = CSynthFast ? 7 : 17;

    const geometry = new THREE.SphereGeometry(radius, rr, rr);
    geometry.name = 'SelectionSpheres geometry';
    if (V.selectiongroup) V.rawscene.remove(V.selectiongroup);
    const group = V.selectiongroup = this.threeObj = new THREE.Group();
    group.name = "SelectionSpheres group";
    V.rawscene.add(group);

    for (let i=0; i<PICKNUM; i++) {
        //yuck.  Ignore the elements that aren't wanted. Will need to change later.
        if (!(i===0 || i===4 || i===5 || i===8 || i===12 || i===13  || i >= 16)) continue;
        const luniforms = CSynth.getCommonUniforms();
        luniforms.pickIndex = {value: i};
        luniforms.opacity = {value: 0.2};

        const material = new THREE.RawShaderMaterial({
            fragmentShader: frag, vertexShader: vert, uniforms: luniforms,
            transparent: !CSynthFast, depthWrite: false, name: "SelectionSphere material "+ i
        });
        material.name = 'SelectionSphere';
        // log("SelectionSphere "+ i);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "SelectionSphere mesh "+ i;
        mesh.frustumCulled = false;
        group.add(mesh);
    }
};

/* nontransparant for white background, to incorporate properly
sg = V.selectiongroup.children;
sg.forEach(x => {m = x.material; m.transparent = false;})
sg.forEach(x => {m = x.material; m.depthWrite = true;})
*/
