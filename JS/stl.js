/*
 * Save object as stl.
 *
 * Currently the mechanism can only generate a single horn.
 * The old render horn at a time with callback is no longer working.
 *
 * We could generate the entire object as a single large gbuffer (NOT oldrender style).
 *
 */

'use strict';
var uniforms, THREE, W, WHITE, gbuffer, inputs, currentGenes, OPMAKEGBUFFX, lennum, radnum, renderer, gl, log, readWebGlFloatDirect,
serious, HW, opmode, renderPass, saveTextfile, OPREGULAR, WebGLRenderTarget, rrender, checkglerror, G, maxTextureSize;
var STL = new function() {
    var s = this;
    var lenn, radn;

    function dot(a,b) {
        return a.x*b.x + a.y*b.y + a.z*b.z;
    }
    function cross(a,b) {
        return { x: a.y*b.z - b.y*a.z, y: a.z*b.x - b.z*a.x, z: a.x*b.y - b.x*a.y};
    }
    function d(a,b) {
        return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z };
    }
    function len(a) {
        return Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
    }
    function vxs(a, v) {
        return { x: a.x*v, y: a.y*v, z: a.z*v };
    }
    function norm(a) {
        return vxs(a, 1/len(a));
    }

    // var ooo = [];  // array of strings being collected
    var oo = "";   // current string being collected
    function o(msg) { oo += msg + "\n"; }
    // var gbuffer;        // gbuffer, rendertarget
    var gbpix;          // byte array buffer used to read into
    var name;
    this.normtype = 3;

    this.output = function(type = 'obj', genes = currentGenes) {
        genes = genes || currentGenes;
        name = genes.name || "unnamed";

        // save special settings needed
        var sdotty = HW.dotty;
        var snorm = G.NORMTYPE;
        HW.dotty = true;
        G.NORMTYPE = this.normtype;
        try {

            // prepare  gbuffer and coordinates
            setupgbuff();  // set up the gbuffer

            renderer.setRenderTarget(gbuffer);
            renderer.clear(true, true, true);
            opmode = OPMAKEGBUFFX;
            renderPass(genes, uniforms, gbuffer);
            gbpix = readWebGlFloatDirect(gbuffer);
            if (gbpix[0] === 0 && gbpix[5] === 0)
                console.error('looks as if gbuffer not set right');
            // log('gbuffers', gbpix.subarray(0, 16));
            // log('gbuffere', gbpix.subarray(gbpix.length - 16));
            // return gbpix;
            const r = setcoord(); // output the only horn saved
            if (type.indexOf('stl') !== -1) stlout(r);
            if (type.indexOf('obj') !== -1) objout(r);

        } finally {
            HW.dotty = sdotty;
            G.NORMTYPE = snorm;
            opmode = OPREGULAR;
            oo = gbpix = undefined;
        }
    };

    function e(v) { return v.toFixed(3);}//.toExponential(); }


    /** setup gbuffer */
    function setupgbuff() {
        lenn = HW.resoverride.lennum || lennum; radn = HW.resoverride.radnum || radnum;
        if (lenn > maxTextureSize - 1) lenn = maxTextureSize - 1;

        if (!uniforms.gbufferres) uniforms.gbufferres = { type: 'v2', value: new THREE.Vector2() };
        uniforms.gbufferres.value.set(lenn+1, radn+1);

        // generate gbuffer if necessary
        if (!gbuffer || uniforms.gbufferres.value.x !== gbuffer.width || uniforms.gbufferres.value.y !== gbuffer.height) {
            //if (gbuffer) { gbuffer.displose(); gbuffer = undefined; }
            //pjt this code is important in relation to rendertarget
            gbuffer = WebGLRenderTarget(uniforms.gbufferres.value.x, uniforms.gbufferres.value.y ,
                { minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType} );
            gbuffer.texture.generateMipmaps = false;
        }
        renderer.setClearColor(WHITE, 1);
   }

    /**
     * collect raw data into 2d vector array
     */
    function setcoord() {
        let q = 0;  // index into gbpix
        var r = [];
        for (let j = 0; j <= radn; j++) {
            var c= [];
            for (let i = 0; i <= lenn; i++) {
                c.push(new THREE.Vector4(gbpix[q++], gbpix[q++], gbpix[q++], gbpix[q++]));
            }
            r.push(c);
        }
        return r;
    }

    /** output in stl format */
    function stlout(r) {
        function vert(a) {
            o("    vertex " + e(a.x) + " " + e(a.y) + " " + e(a.z));
        }

        function tri(a,b,c) {
            var n = norm(cross(d(a,b), d(b,c)));
            o("  facet normal " + e(-n.x) + " " + e(-n.y) + " " + e(-n.z));
            o("  outer loop");
            vert(a);
            vert(c);
            vert(b);
            o("  endloop");
            o("  endfacet");
        }

        oo = "";
        // lenooo = 0;
        o("solid test");
        // lenooo += oo.length;

        for (let i = 0; i < radn; i++) {
            for (let j = 0; j < lenn; j++) {
                tri(r[i][j], r[i+1][j], r[i+1][j+1] );
                tri(r[i][j], r[i+1][j+1], r[i][j+1] );
            }
        }
        o("endsolid test");
        //ooo.push(oo);
        //lenooo += oo.length;
        console.log("saving >>> length " + oo.length);
        saveTextfile([oo], name + ".stl");
    }

    /** output in obj format */
    function objout(r) {
        oo = '';
        const ls = lenn+1;  // length stride
        const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        for (let i = 0; i <= radn; i++) {
            for (let j = 0; j <= lenn; j++) {
                const v = r[i][j];
                const rd = v.w >> 16, g = v.w >> 8 & 255, b = v.w & 255;
                const sqrt = Math.sqrt;
                o(`v ${e(v.x)} ${e(v.y)} ${e(v.z)} ${e(sqrt(rd/255))} ${e(sqrt(g/255))} ${e(sqrt(b/255))}`)

                const ll = r[i === 0 ? i : i-1][j];
                const rr = r[i === radn ? i : i+1][j];
                const aa = r[i][j === 0 ? j : j-1];
                const bb = r[i][j === lenn ? j : j+1];
                v1.subVectors(ll,rr);
                v2.subVectors(aa,bb);
                v1.cross(v2).normalize();
                o(`vn ${e(v1.x)} ${e(v1.y)} ${e(v1.z)}`)
            }
        }
        for (let i = 0; i < radn; i++) {
            for (let j = 0; j < lenn; j++) {
                const a = i*ls + j + 1;
                const b = i*ls + j+1 + 1;
                const c = (i+1)*ls + j+1 + 1;
                const f = (i+1)*ls + j + 1;
                o(`f ${a}//${a} ${b}//${b} ${c}//${c} ${f}//${f} `);
            }
        }
        saveTextfile([oo], name + ".obj");

    }

}();
