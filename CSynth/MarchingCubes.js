/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com
 * Port of http://webglsamples.org/blob/blob.html
 *
 * borrowed from above at https://threejs.org/examples/webgl_marchingcubes.html
 * and modified for different resolution in different directions
 * and to use external field (no metaballs)
 * This just generates the polygons, and does not try to use them.
 * Output positions in 0..xnum etc range, not normalized as in previous version.
 *
 * Added colour options (interpolated) and ids (nearest)
 *
 * Modified to use indices; much more efficient geometry and slightly more efficient processing.
 * However: memory used by key2ind is a significant downside, and using object (dictionary) quite a bit slower.
 * Also, modified to allow for int8/uint8 normals/colors.
 *
 *
 * @author sjpt
 */
'use strict';

var CSynth, THREE, log, msgfixlog;
// var mcrad = 99999; // temp radius

CSynth.MarchingCubes = CSynth.MarchingCubes2SK = function CSynth_MarchingCubes(xnum, ynum, znum) {
    let me = this;
    let field, cols, colorTypePrepare, colscale, colorType = CSynth.colorType, ids, idType;  // will be filled in on makePolygons


    // temp buffer used in polygonize
    const ilist = new Int32Array(12);

    // functions have to be object properties
    // prototype functions kill performance
    // (tested and it was 4x slower !!!)

    // sjpt variables below were 'this.' scope variables
    // arranged as fields to improve error reporting by VS code etc and runtime as variables removed/renamed

    // size of field, 32 is pushing it in Javascript :)
    const size3 = xnum * ynum * znum;
    // let key2ind = {}; // new Array(size3*3);  // this holds index values for intersection point indexed by q*3 + dir
    let key2ind = new Int32Array(size3*3);  // this holds index values for intersection point indexed by q*3 + dir
    key2ind.fill(99999999);

    const yd = xnum;
    const zd = xnum * ynum;

    const normal_cache = new CSynth.normalType(size3 * 3);  // cache of normals at voxel corners

    let bpos, bnorm, bcol, bid, indices, bposn, bindn;

    ///////////////////////
    // Polygonization
    ///////////////////////

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // normalize a group of 3 entries in nlist, does not appear to make any difference
    // that may also depend on where normaization is done in shader
    // not generally used
    // function nn(offset) {
    //     const x = nlist[offset];
    //     const y = nlist[offset+1];
    //     const z = nlist[offset+2];
    //     const l = Math.sqrt(x*x + y*y + z*z);
    //     nlist[offset] /= l;
    //     nlist[offset+1] /= l;
    //     nlist[offset+2] /= l;
    // }
    let nnx = 0, nny = 0, nnz = 0, nnxr = 0;

    function _VIntX(q, offset, isol, x, y, z, valp1, valp2) {
        nnx++;
        const key = q;
        let ind = key2ind[key];
        if (ind === 99999999) {  // when we had !ind the cost was much higher, especially in VIntX
            nnxr++;
            const bn = bposn;
            ind = key2ind[key] = bposn / 3;

            let mu = (isol - valp1) / (valp2 - valp1),
                nc = normal_cache;

            bpos[bn] = x + mu;
            bpos[bn+1] = y;
            bpos[bn+2] = z;


            // if (valp1 === 0) mu = 1;     // forcing the normals this way does not seem to help
            // if (valp2 === 0) mu = 0;
            bnorm[bn] = lerp(nc[q + 0], nc[q + 3], mu);
            bnorm[bn+1] = lerp(nc[q + 1], nc[q + 4], mu);
            bnorm[bn+2] = lerp(nc[q + 2], nc[q + 5], mu);
            // nn(offset);

            if (valp1 === 0) mu = 1;  // helps with extreme gradients, found, eg with radInfluence 1.01
            if (valp2 === 0) mu = 0;
            if (cols) {
                bcol[bn] = lerp(cols[q + 0], cols[q + 3], mu) * colscale;
                bcol[bn+1] = lerp(cols[q + 1], cols[q + 4], mu) * colscale;
                bcol[bn+2] = lerp(cols[q + 2], cols[q + 5], mu) * colscale;
            }
            if (ids) {
                bid[bn/3] = ids[(mu < 0.5 ? q : (q+3))/3];
            }
            bposn += 3;
        }
        ilist[offset] = ind;
    }

    function _VIntY(q, offset, isol, x, y, z, valp1, valp2) {
        nny++;
        const key = q + 1;
        let ind = key2ind[key];
        if (ind === 99999999) {
            const bn = bposn;
            ind = key2ind[key] = bposn / 3;
            let mu = (isol - valp1) / (valp2 - valp1),
                nc = normal_cache;

            bpos[bn] = x;
            bpos[bn+1] = y+mu;
            bpos[bn+2] = z;

            const q2 = q + yd * 3;

            // if (valp1 === 0) mu = 1;
            // if (valp2 === 0) mu = 0;
            bnorm[bn] = lerp(nc[q + 0], nc[q2 + 0], mu);
            bnorm[bn+1] = lerp(nc[q + 1], nc[q2 + 1], mu);
            bnorm[bn+2] = lerp(nc[q + 2], nc[q2 + 2], mu);
            // nn(offset);

            if (valp1 === 0) mu = 1;  // helps with extreme gradients, found, eg with radInfluence 1.01
            if (valp2 === 0) mu = 0;
            if (cols) {
                bcol[bn] = lerp(cols[q + 0], cols[q2 + 0], mu) * colscale;
                bcol[bn+1] = lerp(cols[q + 1], cols[q2 + 1], mu) * colscale;
                bcol[bn+2] = lerp(cols[q + 2], cols[q2 + 2], mu) * colscale;
            }
            if (ids) {
                bid[bn/3] = ids[(mu < 0.5 ? q : q2)/3];
            }
           bposn += 3;
        }
        ilist[offset] = ind;
    }

    function _VIntZ(q, offset, isol, x, y, z, valp1, valp2) {
        nnz++;
        const key = q + 2;
        let ind = key2ind[key];
        if (ind === 99999999) {
            const bn = bposn;
            ind = key2ind[key] = bposn / 3;

            let mu = (isol - valp1) / (valp2 - valp1),
                nc = normal_cache;

            bpos[bn] = x;
            bpos[bn+1] = y;
            bpos[bn+2] = z+mu;

            const q2 = q + zd * 3;

            // if (valp1 === 0) mu = 1;
            // if (valp2 === 0) mu = 0;
            bnorm[bn] = lerp(nc[q + 0], nc[q2 + 0], mu);
            bnorm[bn+1] = lerp(nc[q + 1], nc[q2 + 1], mu);
            bnorm[bn+2] = lerp(nc[q + 2], nc[q2 + 2], mu);
            // nn(offset);


            if (valp1 === 0) mu = 1;  // helps with extreme gradients, found, eg with radInfluence 1.01
            if (valp2 === 0) mu = 0;
            if (cols) {
                bcol[bn] = lerp(cols[q + 0], cols[q2 + 0], mu) * colscale;
                bcol[bn+1] = lerp(cols[q + 1], cols[q2 + 1], mu) * colscale;
                bcol[bn+2] = lerp(cols[q + 2], cols[q2 + 2], mu) * colscale;
            }
            if (ids) {
                bid[bn/3] = ids[(mu < 0.5 ? q : q2)/3];
            }
            bposn += 3;
        }
        ilist[offset] = ind;
    }

    /** compute normal, allowing for edge cases
     * Quick profiles have shown that even with recompute of x,y,z and allowing for edge cases
     * compNorm only takes around 1/30th of the time spent in polygonize,
     * so it is not worth arranging an option to revert to 1 voxel borders with no edge cases here.
     *
     * ? 27/04/2020, but it is wrong in edge cases, as at least one of xn,yn,zn will be half what it should be
    */
    function _compNorm(q) {

        const q3 = q * 3;
        if (normal_cache[q3] === 0.0) {
            const x = q%xnum, yz = (q-x)/xnum, y = yz % ynum, z = (yz-y)/ynum;
            let xn = field[x === 0 ? q : (q -  1)] - field[x === xnum-1 ? q : (q +  1)];
            let yn = field[y === 0 ? q : (q - yd)] - field[y === znum-1 ? q : (q + yd)];
            let zn = field[z === 0 ? q : (q - zd)] - field[z === znum-1 ? q : (q + zd)];
            if (isNaN(xn + yn + zn)) xn = yn = zn = 1;  // not correct, but almost patches edges of medial surface

            //// normalizing here helps a little in extreme cases
            if (CSynth.normalType === Int8Array) {
                const l = 127 / Math.sqrt(xn*xn + yn*yn + zn*zn);
                normal_cache[q3 + 0] = xn*l;
                normal_cache[q3 + 1] = yn*l;
                normal_cache[q3 + 2] = zn*l;
                return;
            }
            normal_cache[q3 + 0] = xn;
            normal_cache[q3 + 1] = yn;
            normal_cache[q3 + 2] = zn;
        }

    }

    // Returns total number of triangles. Fills triangles.
    // (this is where most of time is spent - it's inner work of O(n3) loop )
    // fx,fy,fz give low coordinates of voxel, q gives voxel index;  q !== fx + fy*yd + fz*zd
    // isol is the iso level (threshold); typically 1, or 0 for medial surface

    function polygonize(fx, fy, fz, q, isol) {
        if (bposn + 60 > bpos.length) {
            let n = Math.floor(bposn * 1.5);  // arbitary growth factor
            let t;
            t = new Float32Array(n); t.set(bpos); bpos = t;
            t = new CSynth.normalType(n); t.set(bnorm); bnorm = t;
            if (cols) {t = new colorType(n); t.set(bcol); bcol = t};
            if (ids) {t = new idType(Math.ceil(n/3)); t.set(bid); bid = t};
        }
        if (bindn + 60 > indices.length) {
            let n = Math.floor(bindn * 1.5);  // arbitary growth factor
            let t;
            t = new Uint32Array(n); t.set(indices); indices = t;
        }

        // cache indices
        const q1 = q + 1,
            qy = q + yd,
            qz = q + zd,
            q1y = q1 + yd,
            q1z = q1 + zd,
            qyz = q + yd + zd,
            q1yz = q1 + yd + zd;

        let cubeindex = 0;

        const f = field;
        const field0 = f[q],
            field1 = f[q1],
            field2 = f[qy],
            field3 = f[q1y],
            field4 = f[qz],
            field5 = f[q1z],
            field6 = f[qyz],
            field7 = f[q1yz];

        if (field0 < isol) cubeindex |= 1;
        if (field1 < isol) cubeindex |= 2;
        if (field2 < isol) cubeindex |= 8;
        if (field3 < isol) cubeindex |= 4;
        if (field4 < isol) cubeindex |= 16;
        if (field5 < isol) cubeindex |= 32;
        if (field6 < isol) cubeindex |= 128;
        if (field7 < isol) cubeindex |= 64;

        // if cube is entirely in/out of the surface - bail, nothing to draw

        const bits = edgeTable[cubeindex];
        if (bits === 0) return 0;

        const fx2 = fx + 1,
            fy2 = fy + 1,
            fz2 = fz + 1;
        // const q3 = q * 3;

        // get local references, may be marginally more efficient
        const compNorm = _compNorm, VIntX = _VIntX, VIntY = _VIntY, VIntZ = _VIntZ;

        // front of the cube
        if (bits & 1) {
            compNorm(q);
            compNorm(q1);
            VIntX(q * 3, 0, isol, fx, fy, fz, field0, field1);
        }
        if (bits & 2) {
            compNorm(q1);
            compNorm(q1y);
            VIntY(q1 * 3, 1, isol, fx2, fy, fz, field1, field3);
        }
        if (bits & 4) {
            compNorm(qy);
            compNorm(q1y);
            VIntX(qy * 3, 2, isol, fx, fy2, fz, field2, field3);
        }
        if (bits & 8) {
            compNorm(q);
            compNorm(qy);
            VIntY(q * 3, 3, isol, fx, fy, fz, field0, field2);
        }
        // back of the cube
        if (bits & 16) {
            compNorm(qz);
            compNorm(q1z);
            VIntX(qz * 3, 4, isol, fx, fy, fz2, field4, field5);
        }
        if (bits & 32) {
            compNorm(q1z);
            compNorm(q1yz);
            VIntY(q1z * 3, 5, isol, fx2, fy, fz2, field5, field7);
        }
        if (bits & 64) {
            compNorm(qyz);
            compNorm(q1yz);
            VIntX(qyz * 3, 6, isol, fx, fy2, fz2, field6, field7);
        }
        if (bits & 128) {
            compNorm(qz);
            compNorm(qyz);
            VIntY(qz * 3, 7, isol, fx, fy, fz2, field4, field6);
        }
        // backward lines of the cube
        if (bits & 256) {
            compNorm(q);
            compNorm(qz);
            VIntZ(q * 3, 8, isol, fx, fy, fz, field0, field4);
        }
        if (bits & 512) {
            compNorm(q1);
            compNorm(q1z);
            VIntZ(q1 * 3, 9, isol, fx2, fy, fz, field1, field5);
        }
        if (bits & 1024) {
            compNorm(q1y);
            compNorm(q1yz);
            VIntZ(q1y * 3, 10, isol, fx2, fy2, fz, field3, field7);
        }
        if (bits & 2048) {
            compNorm(qy);
            compNorm(qyz);
            VIntZ(qy * 3, 11, isol, fx, fy2, fz, field2, field6);
        }
        cubeindex <<= 4;  // re-purpose cubeindex into an offset into triTable; each triTable entry is 16 wide

        let o1, o2, o3, numtris = 0, i = 0;

        // here is where triangles are created
        const _triTable = triTable;

        while (_triTable[cubeindex + i] !== - 1) {

            o1 = cubeindex + i;
            o2 = o1 + 1;
            o3 = o1 + 2;

            posnormtriv(ilist,
                _triTable[o1],
                _triTable[o2],
                _triTable[o3]
            );

            i += 3;
            numtris++;

        }

        return numtris;

    }

    /////////////////////////////////////
    // Collect data
    /////////////////////////////////////

    function posnormtriv(il, o1, o2, o3) {
        indices[bindn++] = il[o1];
        indices[bindn++] = il[o2];
        indices[bindn++] = il[o3];
    }
    this.makePolygons = function MarchingCubes_makePolygons (pfield, thresh = 10, pcols, pids) {
        field = pfield;
        cols = pcols;
        ids = pids;
        const polystats = me.polystats = new Int32Array(10);
        // if (cols) colorType = Object.getPrototypeOf(cols).constructor // NO, input and output types may be different
        if (ids) idType = Object.getPrototypeOf(ids).constructor
        //positionArray = new Float32Array(maxCount * 3);
        //normalArray = new Float32Array(maxCount * 3);
        //if (cols) colArray = new Float32Array(maxCount * 3);
        const startSize = 1e6;
        bpos = new Float32Array(startSize);
        bnorm = new CSynth.normalType(startSize);
        if (cols) bcol = new colorType(startSize);
        colscale = colorType === Uint8Array ? 1 : 1/255;
        // log('colscale for MarchingCubes', colscale) // input colours cols always scaled to 255
        if (ids) bid = new idType(Math.ceil(startSize/3));
        indices = new Uint32Array(startSize);
        bposn = bindn = 0;

        // Triangulate. Yeah, this is slow.
        // NOTE: full range in x,y,z leaves compNorm to need special edge cases
        for (let z = 0; z < znum - 1; z++) {

            const z_offset = zd * z;

            for (let y = 0; y < ynum - 1; y++) {

                const y_offset = z_offset + yd * y;

                for (let x = 0; x < xnum - 1; x++) {
// if ((x-xnum/2)**2 + (y-ynum/2)**2 + (z-znum/2)**2 > mcrad*mcrad) continue;  // temp radius code
                    const q = y_offset + x;
                    const nt = polygonize(x, y, z, q, thresh);
                    polystats[nt]++;
                }

            }
        }
        indices = indices.slice(0, bindn);
        bpos = bpos.slice(0, bposn);
        bnorm = bnorm.slice(0, bposn);
        if (cols) bcol = bcol.slice(0, bposn);
        if (ids) bid = bid.slice(0, bposn/3);
        return { indices, bpos, bnorm, bcol, bid, polystats };

    };

    // make the polygons and generate geometry
    this.makeGeometry = function MarchingCubes_makeGeometry(pfield, thresh = 10, pcols, pids) {
        const k = `makePolygons2SK ${xnum} ${ynum} ${znum} ${thresh} `
        const st = Date.now();
        if (CSynth.recordProfiles) console.profile(k);
        key2ind.fill(99999999);
        const dd = me.makePolygons(pfield, thresh, pcols, pids);
        if (CSynth.recordProfiles) console.profileEnd(k);
        const time = Date.now() - st;
        //msgfixlog('>>>> ind SK vertices', dd.bpos.length/3, 'tri', dd.indices.length/3, 'thresh', thresh, 'time', time,
        //    'nnnn', nnx, nnxr, nny, nnz);

        const mgeo = new THREE.BufferGeometry(); mgeo.name = 'mcubesBufferGemetry';
        mgeo.addAttribute('position', new THREE.BufferAttribute( dd.bpos, 3 ));
        mgeo.addAttribute('normal', new THREE.BufferAttribute( dd.bnorm, 3 ));
        if (cols) {
            // n.b. last parameter allows for normalized buffer (0..1, not 0..255) for Uint8Array
            mgeo.addAttribute('color', new THREE.BufferAttribute( dd.bcol, 3));
            mgeo.attributes.color.normalized = true;    // if it is Float32Array normalization ignored anyway
        }

        mgeo.setIndex(new THREE.BufferAttribute(dd.indices,1));
        mgeo.objectId = dd.bid;   // could make an attribute later if we have custom shaders that use id

        return mgeo;
    }

    /////////////////////////////////////
    // Marching cubes lookup tables
    /////////////////////////////////////

    // These tables are straight from Paul Bourke's page:
    // http://local.wasp.uwa.edu.au/~pbourke/geometry/polygonise/
    // who in turn got them from Cory Gene Bloyd.

    // table of used edges.  Implicit in triTable.
    const edgeTable = new Int32Array([
        0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
        0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
        0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
        0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
        0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
        0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
        0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
        0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
        0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
        0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
        0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
        0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
        0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
        0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
        0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
        0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
        0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
        0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
        0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
        0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
        0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
        0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
        0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
        0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
        0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
        0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
        0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
        0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
        0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
        0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
        0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
        0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0]);

    // table of how the edges are used to create triangles
    const triTable = new Int32Array([
        - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 8, 3, 9, 8, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 2, 10, 0, 2, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 8, 3, 2, 10, 8, 10, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 11, 2, 8, 11, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 9, 0, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 11, 2, 1, 9, 11, 9, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 10, 1, 11, 10, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 10, 1, 0, 8, 10, 8, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 9, 0, 3, 11, 9, 11, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 3, 0, 7, 3, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 1, 9, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 1, 9, 4, 7, 1, 7, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 4, 7, 3, 0, 4, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 2, 10, 9, 0, 2, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
        8, 4, 7, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 4, 7, 11, 2, 4, 2, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 0, 1, 8, 4, 7, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, - 1, - 1, - 1, - 1,
        3, 10, 1, 3, 11, 10, 7, 8, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, - 1, - 1, - 1, - 1,
        4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
        4, 7, 11, 4, 11, 9, 9, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 5, 4, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 5, 4, 1, 5, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 5, 4, 8, 3, 5, 3, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 0, 8, 1, 2, 10, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 2, 10, 5, 4, 2, 4, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, - 1, - 1, - 1, - 1,
        9, 5, 4, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 11, 2, 0, 8, 11, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 5, 4, 0, 1, 5, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, - 1, - 1, - 1, - 1,
        10, 3, 11, 10, 1, 3, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, - 1, - 1, - 1, - 1,
        5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
        5, 4, 8, 5, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 7, 8, 5, 7, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 3, 0, 9, 5, 3, 5, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 7, 8, 0, 1, 7, 1, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 7, 8, 9, 5, 7, 10, 1, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, - 1, - 1, - 1, - 1,
        8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, - 1, - 1, - 1, - 1,
        2, 10, 5, 2, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 9, 5, 7, 8, 9, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
        2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, - 1, - 1, - 1, - 1,
        11, 2, 1, 11, 1, 7, 7, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, - 1, - 1, - 1, - 1,
        5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, - 1,
        11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, - 1,
        11, 10, 5, 7, 11, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 0, 1, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 8, 3, 1, 9, 8, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 6, 5, 2, 6, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 6, 5, 1, 2, 6, 3, 0, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 6, 5, 9, 0, 6, 0, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, - 1, - 1, - 1, - 1,
        2, 3, 11, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 0, 8, 11, 2, 0, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 1, 9, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, - 1, - 1, - 1, - 1,
        6, 3, 11, 6, 5, 3, 5, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
        3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, - 1, - 1, - 1, - 1,
        6, 5, 9, 6, 9, 11, 11, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 10, 6, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 3, 0, 4, 7, 3, 6, 5, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 9, 0, 5, 10, 6, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
        6, 1, 2, 6, 5, 1, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, - 1, - 1, - 1, - 1,
        8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, - 1, - 1, - 1, - 1,
        7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, - 1,
        3, 11, 2, 7, 8, 4, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
        0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1,
        9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, - 1,
        8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
        5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, - 1,
        0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, - 1,
        6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, - 1, - 1, - 1, - 1,
        10, 4, 9, 6, 4, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 10, 6, 4, 9, 10, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 0, 1, 10, 6, 0, 6, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
        1, 4, 9, 1, 2, 4, 2, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, - 1, - 1, - 1, - 1,
        0, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 3, 2, 8, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 4, 9, 10, 6, 4, 11, 2, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, - 1, - 1, - 1, - 1,
        3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
        6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, - 1,
        9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, - 1, - 1, - 1, - 1,
        8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, - 1,
        3, 11, 6, 3, 6, 0, 0, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        6, 4, 8, 11, 6, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 10, 6, 7, 8, 10, 8, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, - 1, - 1, - 1, - 1,
        10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, - 1, - 1, - 1, - 1,
        10, 6, 7, 10, 7, 1, 1, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
        2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, - 1,
        7, 8, 0, 7, 0, 6, 6, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 3, 2, 6, 7, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
        2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, - 1,
        1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, - 1,
        11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, - 1, - 1, - 1, - 1,
        8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, - 1,
        0, 9, 1, 11, 6, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, - 1, - 1, - 1, - 1,
        7, 11, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 0, 8, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 1, 9, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 1, 9, 8, 3, 1, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 1, 2, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, 3, 0, 8, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 9, 0, 2, 10, 9, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, - 1, - 1, - 1, - 1,
        7, 2, 3, 6, 2, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        7, 0, 8, 7, 6, 0, 6, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 7, 6, 2, 3, 7, 0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, - 1, - 1, - 1, - 1,
        10, 7, 6, 10, 1, 7, 1, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, - 1, - 1, - 1, - 1,
        0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, - 1, - 1, - 1, - 1,
        7, 6, 10, 7, 10, 8, 8, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        6, 8, 4, 11, 8, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 6, 11, 3, 0, 6, 0, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 6, 11, 8, 4, 6, 9, 0, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, - 1, - 1, - 1, - 1,
        6, 8, 4, 6, 11, 8, 2, 10, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, - 1, - 1, - 1, - 1,
        4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, - 1, - 1, - 1, - 1,
        10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, - 1,
        8, 2, 3, 8, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, - 1, - 1, - 1, - 1,
        1, 9, 4, 1, 4, 2, 2, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, - 1, - 1, - 1, - 1,
        10, 1, 0, 10, 0, 6, 6, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, - 1,
        10, 9, 4, 6, 10, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 9, 5, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, 4, 9, 5, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 0, 1, 5, 4, 0, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, - 1, - 1, - 1, - 1,
        9, 5, 4, 10, 1, 2, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, - 1, - 1, - 1, - 1,
        7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, - 1, - 1, - 1, - 1,
        3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, - 1,
        7, 2, 3, 7, 6, 2, 5, 4, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, - 1, - 1, - 1, - 1,
        3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, - 1, - 1, - 1, - 1,
        6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, - 1,
        9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, - 1, - 1, - 1, - 1,
        1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, - 1,
        4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, - 1,
        7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, - 1, - 1, - 1, - 1,
        6, 9, 5, 6, 11, 9, 11, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, - 1, - 1, - 1, - 1,
        0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, - 1, - 1, - 1, - 1,
        6, 11, 3, 6, 3, 5, 5, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, - 1, - 1, - 1, - 1,
        0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, - 1,
        11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, - 1,
        6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, - 1, - 1, - 1, - 1,
        5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, - 1, - 1, - 1, - 1,
        9, 5, 6, 9, 6, 0, 0, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, - 1,
        1, 5, 6, 2, 1, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, - 1,
        10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, - 1, - 1, - 1, - 1,
        0, 3, 8, 5, 6, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 5, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 5, 10, 7, 5, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 5, 10, 11, 7, 5, 8, 3, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 11, 7, 5, 10, 11, 1, 9, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, - 1, - 1, - 1, - 1,
        11, 1, 2, 11, 7, 1, 7, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, - 1, - 1, - 1, - 1,
        9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, - 1, - 1, - 1, - 1,
        7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, - 1,
        2, 5, 10, 2, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, - 1, - 1, - 1, - 1,
        9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, - 1, - 1, - 1, - 1,
        9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, - 1,
        1, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 7, 0, 7, 1, 1, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 0, 3, 9, 3, 5, 5, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 8, 7, 5, 9, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 8, 4, 5, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, - 1, - 1, - 1, - 1,
        0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, - 1, - 1, - 1, - 1,
        10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, - 1,
        2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, - 1, - 1, - 1, - 1,
        0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, - 1,
        0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, - 1,
        9, 4, 5, 2, 11, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, - 1, - 1, - 1, - 1,
        5, 10, 2, 5, 2, 4, 4, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, - 1,
        5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, - 1, - 1, - 1, - 1,
        8, 4, 5, 8, 5, 3, 3, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 4, 5, 1, 0, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, - 1, - 1, - 1, - 1,
        9, 4, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 11, 7, 4, 9, 11, 9, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, - 1, - 1, - 1, - 1,
        1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, - 1, - 1, - 1, - 1,
        3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, - 1,
        4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, - 1, - 1, - 1, - 1,
        9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, - 1,
        11, 7, 4, 11, 4, 2, 2, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, - 1, - 1, - 1, - 1,
        2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, - 1, - 1, - 1, - 1,
        9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, - 1,
        3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, - 1,
        1, 10, 2, 8, 7, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 9, 1, 4, 1, 7, 7, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, - 1, - 1, - 1, - 1,
        4, 0, 3, 7, 4, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        4, 8, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 0, 9, 3, 9, 11, 11, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 1, 10, 0, 10, 8, 8, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 1, 10, 11, 3, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 2, 11, 1, 11, 9, 9, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, - 1, - 1, - 1, - 1,
        0, 2, 11, 8, 0, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        3, 2, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 3, 8, 2, 8, 10, 10, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        9, 10, 2, 0, 9, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, - 1, - 1, - 1, - 1,
        1, 10, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        1, 3, 8, 9, 1, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 9, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        0, 3, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
        - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1]);

};
