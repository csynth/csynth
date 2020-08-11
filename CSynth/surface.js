// old code used for LMV and simple pre-organic rendering
'use strict';

var THREE, numInstancesP2, numInstances, renderer, CSynth, uniforms, currentGenes, log, W, V, dat, guiFromGene,
addgeneperm, copyFrom, CSynthFast, G, arrayStats, VEC3, col3, randi, msgfixerror, performance, msgfix, S,
frametime, framedelta, FIRST, msgfixlog;

/** TODO
 * adjust so the and r do not depend on res
 * adjust field function
 * add gui (make a standard gui for colour, transparency, ...)
 * do lots of work in parallel workers
 */

CSynth.normalType = Int8Array;
CSynth.colorType = Uint8Array;              // type used for colours stored in colour attribute buffers
CSynth.colorTypePrepare = Float32Array;     // type used for colours during surface=>mesh geenrataion
// Uint8Array;  Uint8 needs gamma to avoid fidelity loss, => different shaders?
CSynth.idType = Uint32Array;


/** metaball surface rendering for non-organic use:
 * This fills the grid in prepartion for marching cubes.
 * The grid may also be used to colour a separate field rendering surface (imagevisp.js)
160/2/2 course but sort of OK */
CSynth.fillGrid = function fillGrid(fid, options) {

    const {
        radInfluence = 2, radMult = 1,
        usecols = true, useids = false,
        cubic = true, xxmult = 3, threshold, justCA = false
    } = options;
    let {res = 320, low, high} = options;

    const radInfluence2 = radInfluence * radInfluence;  // sqr of rad influence
    const dddd = 1/(radInfluence2-1);
    const radInfluenceNorm = dddd*dddd* (cubic ? dddd : 1);   // compensate factor

    while (fid.files) fid = fid.files[0];
    const glmol = CSynth.glmol[fid];
    window.glmol = glmol; // for debug
    // glmol.colorByAtom(glmol.atomlist, true);
    // glmol.colorByChain(glmol.atomlist, true);
    //const atoms = glmol.atoms;
    //const cc = atoms.filter(x=>x);
    let cc = glmol.atomlist.map(i => glmol.atoms[i]);    // eg respect excludeChains
    if (justCA)                                    // justCA could be more flexible, but simple for simple checkbox UI
        cc = cc.filter(a => a.atom === 'CA');
    if (cc.length === 0) return;

    const stats = cc.stats || arrayStats(cc);

    const xspace = radMult * xxmult * radInfluence;          // xspace is extra space to allow for spread, but needs to be relative to scale
    if (!low) low = VEC3(stats.minx - xspace, stats.miny - xspace, stats.minz - xspace);
    if (!high) high = VEC3(stats.maxx + xspace, stats.maxy + xspace, stats.maxz + xspace);
    if (CSynth.fillGrid.res3) res = CSynth.fillGrid.res3;
    if (typeof res === 'number') {
        const size = VEC3().subVectors(high, low);
        const m = res / Math.max(size.x, size.y, size.z);
        res = size.multiplyScalar(m).ceil();
    }

    // Note: these arrays are not kept around, under the assumption that this call will be relatively infrequent.
    // It would be easy to cache them if we want more frequent calls.
    const resxyz = res.x * res.y * res.z;
    const a = new Float32Array(resxyz);
    const cols = usecols ? new CSynth.colorTypePrepare(resxyz*3) : null;
    const ids = useids ? new CSynth.idType(resxyz) : null;
    const idf = useids ? new Uint8Array(resxyz) : null;  // strength for closest id yet, no need for precision

    let sx = res.x / (high.x - low.x);  // scale from real->grid coordinates
    let sy = res.y / (high.y - low.y);  // scale
    let sz = res.z / (high.z - low.z);  // scale
    sx = sy = sz = Math.min(sx, sy, sz);

    const col = new THREE.Color();
    const colscale = 255; // alwyas scale to 255 for (intermediate) grid colour values. CSynth.colorTypePrepare === Uint8Array ? 255 : 1;
    const vdwRadii = glmol.vdwRadii;
    let negtodo = true;

    for (let p=0; p < cc.length; p++) {
        const rc = cc[p];       // real position
        const weight = rc.chain === options.xchain ? -1 : 1;
        if (negtodo && weight < 0) {    // this assumes xchain is last chain ....., will fix by keeping two arrays
            a.forEach((v,i) => {if (v === 0) a[i] = CSynth.fillGrid.filler});
            negtodo = false;
        }
        const rb = radMult * (vdwRadii[rc.elem] || 2);
        const rg = rb * sx;    // radius in grid coords: TODO consider scales not all equal
        const ri = 1/rg;        // inverse
        const rr = Math.ceil(rg * radInfluence);  // range we must cover in grid coords

        col.set(rc.color);
        // col.setRGB(1,1,1);  // debug
        const c = VEC3();
        c.x = (rc.x - low.x) * sx;  // pos in grid space
        c.y = (rc.y - low.y) * sy;
        c.z = (rc.z - low.z) * sz;

        let cix = Math.round(c.x);  // nearest grid point to pos
        let ciy = Math.round(c.y);
        let ciz = Math.round(c.z);

        for (let dz = -rr; dz <= rr; dz++) {
            const iz = dz + ciz;
            if (iz < 0 || iz >= res.z) continue;
            const zz = iz * res.x * res.y;
            for (let dy = -rr; dy <= rr; dy++) {
                const iy = dy + ciy;
                if (iy < 0 || iy >= res.y) continue;
                const yy = iy * res.x + zz;
                for (let dx = -rr; dx <= rr; dx++) {
                    const ix = dx + cix;
                    if (ix < 0 || ix >= res.x) continue;
                    const xx = yy + ix;                     // final full index for this position
                    const d2g = (c.x - ix)**2 + (c.y - iy)**2 + (c.z - iz)**2;  // dist in grid coords
                    const d2 = d2g * ri * ri;  // scale r2 to operate as if radius is 1
                    if (d2 > radInfluence2) continue;
                    const ddd = radInfluence2 - d2;
                    let f;
                    if (cubic) {
                        f = ddd*ddd*ddd * radInfluenceNorm * weight;
                    } else {
                        f = ddd*ddd * radInfluenceNorm * weight;
                    }

                    // const d = Math.sqrt(d2);
                    // if (d >= rr) continue;
                    // // const f = (r*r - d2) ** 2;   // this one gives lots of black, why??
                    // const f = (rr - d) ** 2;
                    //if (weight < 0)
                    //    f *= 1;
                    //if (weight < 0 && a[xx] < 0.0001 && f > -0.0001)
                    //    a[xx] = NaN;
                    a[xx] += f;
                    if (usecols) {
                        cols[xx*3] += f * col.r * colscale; // bias the colour by weight f
                        cols[xx*3+1] += f * col.g * colscale;
                        cols[xx*3+2] += f * col.b * colscale;
                    }
                    if (useids) {
                        const ff = Math.min(f * 65, 255);  // if big, it doesn't matter how big
                        if (ff > idf[xx]) {
                            ids[xx] = rc.serial;
                            idf[xx] = ff;
                        }
                    }
                } // dx
            } // dy
        } // dz
    } // atom p

    if (usecols) {
        const pp = cubic ? 1/3 : 1/2;
        for (let i = 0; i < a.length; i++) {    // normalize colours according to total weight a[i]
            if (a[i] !== 0) {
                const cs = 1 / a[i];
                cols[i*3] *= cs;
                cols[i*3+1] *= cs;
                cols[i*3+2] *= cs;
                // experiment to force linear dropoff for simple sphere
                //const ddd = (a[i] / radInfluenceNorm) ** pp;
                //const d2 = radInfluence2 - ddd;
                //a[i] = Math.sqrt(d2);
            //} else {
            //    a[i] = radInfluence;
            }
        }
    }
    //log(`filled ${cc.length} atoms`);
    return {a, cols, ids, sx, sy, sz, low, high, res, threshold};
} // fillgrid
CSynth.fillGrid.filler = NaN;   // value for filler in cheat medial surface

/** compute a surface with marching cubes
 * find, mesh, {low, high, res, th, radInfluence, usecols, useids, cubic, xxmult}
*/
CSynth.Surface = function CSynth_Surface(fid, mesh, options) {

    const gst = performance.now();
    const griddata = CSynth.fillGrid(fid, options);
    const gridtime = performance.now() - gst;
    if (!griddata) {mesh.geometry = new THREE.BufferGeometry(); return; }  // nothing
    useGrid(griddata);


    function useGrid({a, cols, ids, sx, sy, sz, low, high, res, theshold = options.xchain === 'none' ? 1 : 0}) {
        const st = performance.now();
        const mc = new CSynth.MarchingCubes(res.x, res.y, res.z);
        const mgeo = mc.makeGeometry(a, theshold, cols, ids);
        msgfixlog('MarchingCubes', `fill=${gridtime} march=${performance.now() - st} res=${res.x} ${res.y} ${res.z} size=${1/sx}`);
        mesh.geometry = mgeo;

        // todo get centre and scale out of metadata
        mesh.position.copy(low); // set(low.x - xx, low.y - xx, low.z - xx);
        mesh.scale.set(1/sx, 1/sy, 1/sz);
        mesh.updateMatrix();
        //pgroup.add(mesh);
    }

}   // Surface

/** colour the surface of a mesh (and/or children of 'mesh') according to given function based on position
* function should have signature (x,y,z,c) where x,y,z are input positions, and c in output colour
 */
CSynth.colourMeshByxyz = function CSynth_colourMeshByxyz(mesh = CSynth.pdbmesh, lowdist = 110, highdist = 130) {
    //we could check mesh.isGroup, but it's possible for any Object3D to have children...
    if (mesh.children.length) {
        mesh.children.forEach(m => CSynth.colourMeshByxyz(m, lowdist, highdist));
    }
    //...and as long as we don't try to process non-existent geometry we should be ok.
    if (!mesh.geometry) return;

    const colfun = (typeof lowdist === 'function') ? lowdist : CSynth.genColfun(lowdist, highdist);
    const mid = (lowdist+highdist)/2;
    const hr = highdist - mid;
    const sc = mesh.scale;
    const c = col3();

    const positionArray = mesh.geometry.attributes.position.array;
    const size = positionArray.length / 3;

    const colAtt = mesh.geometry.attributes.color;
    const dx = mesh.position.x, dy = mesh.position.y, dz = mesh.position.z;
    let colArray;

    if (colAtt) {
        colArray = colAtt.array;
    } else {
        colArray = new CSynth.colorType(size*3);
        mesh.geometry.addAttribute('color', new THREE.BufferAttribute(colArray, 3 ));
        mesh.geometry.attributes.color.normalized = true;    // if it is Float32Array normalization ignored anyway
        if (mesh.material.vertexColors !== THREE.VertexColors) {
            mesh.material.vertexColors = THREE.VertexColors;
            mesh.material.needsUpdate = true;
        }
    }
    mesh.geometry.attributes.color.needsUpdate = true;
    const colscale = colArray instanceof Uint8Array ? 255 : 1;
    //const da = [];
    for (let i = 0; i < positionArray.length; i += 3) {
        // positionArray in in grid/EM image coordinates, eg 0..320
        // -xnum/2 etc will centre it
        // sc will scale it, eg 1 grid point = 1.06A
        const x = (positionArray[i]) * sc.x + dx;
        const y = (positionArray[i+1]) * sc.y + dy;
        const z = (positionArray[i+2]) * sc.z + dz;
        //const d = Math.sqrt(x*x + y*y + z*z);
        //da.push(d);
        colfun(x,y,z, c);
        colArray[i] = c.r * colscale;
        colArray[i+1] = c.g * colscale;
        colArray[i+2] = c.b * colscale;
    }
    // window.da = da;
}

CSynth.genColfun = function CSynth_genColfun(lowdist=110, highdist=120) {
    const mid = (lowdist+highdist)/2;
    const hr = highdist - mid;
    return function colfunxyzdyn(xx,yy,zz,cc) {
        const d = Math.sqrt(xx*xx + yy*yy + zz*zz);
        if (d >= highdist) cc.setRGB(1,0,0);
        else if (d <= lowdist) cc.setRGB(0,1,0);
        else if (d > mid) cc.setRGB(1, 1 - (d - mid)/hr, 0);
        else cc.setRGB((mid - d)/hr, 1, 0);
    }
}

/** colour surface based on id saved, set up atom colorBy unless called with by = 'current',
 * mesh may also be a group or other detail, in which case called recursively
  */
CSynth.colourSurfaceFromID = async function CSynth_colourSurfaceFromID(glmol = window.glmol, options, mesh) {
    if (!mesh)
        debugger;
    const st = performance.now();
    if (options.colorBy !== 'current') {
        CSynth.colorBy(glmol, options, mesh);
        const et1 = performance.now();
        msgfix('colourBy', options.colorBy, 'time', (et1-st).toFixed());
    }
    if (options.colorBy === 'meshDist') return;  // todo, put these decisions in colorBy?

    if (mesh.children && mesh.children.length !== 0) {
        const noptions = {};
        copyFrom(noptions,  options);
        noptions.colorBy = 'current';
        for (let i = 0; i < mesh.children.length; i++) {
            await CSynth.colourSurfaceFromID(glmol, noptions, mesh.children[i]);
        }
        // mesh.children.forEach(async function(c) { await CSynth.colourSurfaceFromID(glmol, noptions, c); });
    }

    if (!mesh.geometry) return;  // may have done children
    const ids = mesh.geometry.objectId;
    if (!ids) return msgfixerror('colourSurface', 'cannot colour surface, no ids')
    let colatt = mesh.geometry.attributes.color;
    let colarr;
    const channels = 3; // CSynth.channelsPerCol || 3;
    // three.js vertex colours do not support alpha ... need to customsize a shader for that
    // so just stick to 3 channels for now.
    if (!colatt || colatt.array.length !== ids.length*channels) {
        colarr = new CSynth.colorType(ids.length*channels);
        const colbuff = new THREE.BufferAttribute(colarr, channels);
        mesh.geometry.addAttribute('color', colbuff);
        mesh.geometry.attributes.color.normalized = true;    // if it is Float32Array normalization ignored anyway
    } else {
        colarr = colatt.array
    }
    if (mesh.material.vertexColors !== THREE.VertexColors) {
        mesh.material.vertexColors = THREE.VertexColors;
        mesh.material.needsUpdate = true;
    }
    const col = col3();
    const atoms = glmol.atoms;
    let time = options.colorByTime;
    // if (time === undefined) time = 1000;
    const endtime = frametime + time;
    let nextIdStop = time ? 0 : -1; // never stop if not timing

    async function nframe(i) {
        mesh.geometry.attributes.color.needsUpdate = true;
        const leftids = ids.length - i;
        const leftt = endtime - frametime;
        const rate = leftids / leftt;
        const newids = Math.ceil(rate * framedelta);
        nextIdStop = i + newids;
        // log ('nframe', {leftids, leftt, rate, newids});
        await S.frame();
    }

    if (colarr instanceof Uint8Array) {
        let p = 0;
        for (let i = 0; i < ids.length; i++) {
            const a = atoms[ids[i]];
            const hex = (a) ? a.color : 0xffffffff;
            colarr[p++] = (hex >> 16 & 255);
            colarr[p++] = (hex >> 8 & 255);
            colarr[p++] = (hex & 255);
            // if (channels === 4) colarr[p++] = 100;
            if (i === nextIdStop) await nframe(i);
        };
    } else {
        let p = 0;
        let colscale = 1/255;
        for (let i = 0; i < ids.length; i++) {
            const a = atoms[ids[i]];
            const hex = (a) ? a.color : 0xffffffff;
            colarr[p++] = (hex >> 16 & 255) * colscale;
            colarr[p++] = (hex >> 8 & 255) * colscale;
            colarr[p++] = (hex & 255) * colscale;
            // if (channels === 4) colarr[p++] = 0.3;
            if (i === nextIdStop) await nframe(i);
        };
    }
    mesh.geometry.attributes.color.needsUpdate = true;
    // colatt.needsUpdate = true
    const et2 = performance.now();
    msgfix('colourSurfaceFromID', 'apply', (et2-st).toFixed());

}
