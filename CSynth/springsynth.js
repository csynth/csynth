'use strict';

var V, HW, THREE, getBody, renderer, init, currentGenes, uniforms, springs, CSynth,
    log, res, showsprings, stats, W, U,
    genedefs, updateGuiGenes, G, shadows, setSize, cMap, fitCanvasToWindow, getfiledata,
    minimizeSkelbuffer, Maestro, onframe, centrescalenow, serious, startscript, processFile,
    addgeneperm, format, readWebGlFloat, skelbuffer, startvr, pick, msgfix, showpick, writetextremote,
    target, remakeShaders, simpleset, setInput, usemask, VH, dat, camera, inputs, pickGPU, renderMainObject, inmutator,
    adduniform, addtaggeduniform, oxcsynth, S, currentLoadingFile, location, msgfixerror, copyFrom, trimstrings, getFileExtension, getFileName,
    customLoadDone, nop, guiFromGene, otraverse, canvas, setAllLots, settings, initialSettings,
    searchValues, currentLoadingData, PICKNUM, readdir,
    scaleDampTarget1, nomess, posturi, GX, msgfixlog, objfilter, geneOverrides, col3, inworker, loadTime,
    currentLoadingDir, resetMat, slowinit, GO, renderVR, sleep, myRequestAnimationFrame, htmlDefines, maxTextureSize,
    Gldebug, startWsListener, distxyz, downloadImage, downloadImageHigh, FIRST, writeBintri, runkeys, STL, islocalhost;
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var CSynthFast;  // set to true even from outside to use fast graphics defaults
//TODO: fragment more extensively into something like CSynth.ShaderChunks[]
CSynth.CommonFragmentShaderCode = () => /*glsl*/`
    ${htmlDefines()}    //
    #define round(c) floor(c+0.5)
    #define PICKNUM ${PICKNUM}
    //CSynth.CommonFragmentShaderCode() --------------
    precision highp float;
// in case we're embedded in a THREE shader, avoid re-defining these properties
#ifndef SHADER_NAME
    uniform mat4 modelViewMatrix;
    uniform mat4 modelMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;
#endif
    uniform float scaleFactor;
    uniform sampler2D scaleDampTarget;
    uniform sampler2D posNewvals;
    uniform sampler2D posHist;
    uniform sampler2D t_ribboncol, t_ribbonrad;  // general textures if needed
    uniform float histtime;
    uniform float HISTLEN;
    uniform float numSegs, numInstancesP2;
    #define numInstances (numSegs + 1.0)
    uniform float USELOGDEPTH;
    uniform sampler2D pickrt;
    #define off (0.5/numInstancesP2)
    #define partpos(p) texture2D(posNewvals, vec2(0.5, (p)+off))

    uniform float cubicCatS;

    //these could be uniform, only computed when buffer changes. Might rename as well.
    //CRITICAL:: consider the case of eg text annotations with different numInstances for selection & spring model
    //In this case, these helper macros for normalisation can be wrong.
    //Solved in that case by pre-processing vertex data

    #define NormalisedToTexCo 1. // (numSegs/numInstancesP2)
	//copied from common.vfs
    //PJT: considering implementing 'pickedness' buffer...
    uniform float userPicks[${PICKNUM-16}];
    float getPick(int i) {  // return value in 0 .. 1
        float r;
        if (!(i==0 || i==4 || i==5 || i==8 || i==12 || i==13 || i >= 16 ) ) return 999.5;
        #define ppick(k) else if (i == 16+k) r = userPicks[k];
        if (i == 16) r = userPicks[0];
        ppick( 1) ppick( 2) ppick( 3)
        ppick( 4) ppick( 5) ppick( 6) ppick( 7)
        ppick( 8) ppick( 9) ppick(10) ppick(11)
        ppick(12) ppick(13) ppick(14) ppick(15)

        else {
            float fslot = float(i) / 4.;
            float slot = floor(fslot);
            vec4 v = texture2D(pickrt, vec2(slot / 4. + 0.125, 0.5));
            int e = int(floor((fslot - slot) * 4.));
            r = e == 0 ? v.x : e == 1 ? v.y : e == 2 ? v.z : e == 3 ? v.w : 999.;
        }
        return r * NormalisedToTexCo; //XXX: ended up dividing by this again in HistoryTrace; careful now.
    }
    //return the range of the region occupied by particle 'p'
    //values in 0 .. numSegs/numInstancesP2 for mid, start, end of the range (order of those to match annotationDisplay...)
    vec4 getPickRange(const in float p, sampler2D bed) {
        // information stored in row 2 of t_ribboncol (see bedParser), other uses updated to read uv.y = 0.25 rather than 0.5.
        // That is probably more efficient and less hassle than adding an extra texture / uniform / etc...
        // ** see also matrixbed; t_ribboncol by any other name... **
        return texture2D(bed, vec2(p/NormalisedToTexCo, 0.75));
    }
    // for a particle p, is it in the range of the region occupied by particle 'pr'?
    // for example, while rendering 'p', should it be considered in range of 'pr' which is a picked particle?
    // returns 1 or 0 for in/out (areas within 'smooth' range will fade)
    // -- not sure how useful this approach to 'smooth' is - ends up feathering end of selection even when pointing to middle...
    float isInPickRange(float p, float pr, float psmooth, sampler2D bed) {   // 'float smooth' fails to compile, why???
        // p /= NormalisedToTexCo; //
        vec4 r = getPickRange(pr, bed); // texture2D(t_ribboncol, vec2(p/NormalisedToTexCo, 0.75));
        // Next lines prevent the end spheres failing to reduce near the ends.
        // As beds are just Unit8Array (22 May 2020) ranges beyond the ends are truncated.
        // We extend them very significantly so we get full pick effect at ends.
        if (r.y == 0.) r.y = -1.;
        if (r.z == 1.) r.z = 2.;
        float v = smoothstep(r.y, r.y+psmooth, p);
        v = min(v, 1. - smoothstep(r.z-psmooth, r.z, p));
        return v;
    }
    vec3 getPickColor(const in int i) {
        if (i < 8)  return vec3(1., 0., 0.);
        if (i < 16) return vec3(0., 1., 0.);
        if (i == 16) return vec3(0., 1., 1.);
        if (i == 17) return vec3(1., 0., 1.);
        if (i == 18) return vec3(1., 1., 0.);
        if (i == 19) return vec3(1., 1., 1.);
        if (i == 20) return vec3(0.5, 1., 1.);
        if (i == 21) return vec3(1., 0.5, 1.);
        if (i == 22) return vec3(1., 1., 0.5);
        if (i == 23) return vec3(1., 1., 1.);
        return vec3(1.,1.,1.);
    }
    #define histpost(p,t) texture2D(posHist, vec2(histtime - (t), (p)))
    #define histpos(p) texture2D(posNewvals, vec2(0, (p)))
    //transforms a point from spring simulation space to world space.
    vec4 pposToWorld(const in vec4 pIn) {
        vec4 p = pIn * scaleFactor;
        // for autopan, taken from hornmaker ... assumes GPUSCALE for simplicity
        #ifndef NOCENTRE  // eg normal case: we are centering
            vec4 xx = texture2D(scaleDampTarget, vec2(0.5 ,0.5));
            p.xyz -= xx.xyz;
        #endif
        p.w = 1.;
        p = modelMatrix * p;
        return p;
    }
    #define partposWorld(p) pposToWorld(partpos(p))
    #define histpostWorld(p,t) pposToWorld(histpost(p,t))
    //yuck.  Ignore the elements that aren't wanted. Will need to change later.
    #define VALID_PICK_INDEX (i==0 || i==4 || i==5 || i==8 || i==12 || i==13 )
    #define SKIP_PICK if (!VALID_PICK_INDEX) continue;

    //http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
    vec3 hsv2rgb(in vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        vec3 pp = c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        return clamp(pp, 0.0, 1.0);  // added sjpt 30 July 2015, can probably remove other clamp???
    }
    vec3 rgb2hsv(in vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    //https://stackoverflow.com/questions/13501081/efficient-bicubic-filtering-code-in-glsl
    // cubic return interpolation weights so interpolation DOES NOT go through control points
    // BUT all the weights are non-negative so that it works properly with textureBicubic.
    vec4 cubic(const in float v){
        vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
        vec4 s = n * n * n;
        float x = s.x;
        float y = s.y - 4.0 * s.x;
        float z = s.z - 4.0 * s.y + 6.0 * s.x;
        float w = 6.0 - x - y - z;
        return vec4(x, y, z, w) * (1.0/6.0);
    }

    // cubicCat return interpolation weights (in 1d) so that interpolation DOES go through control points
    // However, this means some weights are negative, so not suitable to use with textureBicubic
    // uses cubicCatS for control, > 1000 reverts to cubic
    vec4 cubicCat(const in float x) { //catmullrom
        float s = cubicCatS; // 0.5; // potentially adjustable parameter
        if (s > 1000.) return cubic(x);  //
        float x2 = x * x;
        float x3 = x2 * x;
        vec4 w;
        w.x =     -s*x3 +     2.*s*x2 - s*x  + 0.;
        w.y = (2.-s)*x3 +   (s-3.)*x2        + 1.;
        w.z = (s-2.)*x3 + (3.-2.*s)*x2 + s*x + 0.;
        w.w =      s*x3 -       s*x2         + 0.;
        return w;
    }

    //https://stackoverflow.com/questions/13501081/efficient-bicubic-filtering-code-in-glsl
    // This does a bicubic interpolation.
    // It relies on a trick to perform this with just 4 (bilinear) texture lookups,
    // to get the 16 samples needed for bicubic.
    // This trick DOES NOT WORK for negative weights  (eg cubicCat)
    vec4 textureBicubic(sampler2D sampler, vec2 texCoords){
        //XXX: need WebGL2::: currently hardcoding to use HISTLEN,numInstancesP2 for histpos...
        //vec2 texSize = textureSize(sampler, 0);
        vec2 texSize = vec2(HISTLEN, numInstancesP2);
        vec2 invTexSize = 1.0 / texSize;

        texCoords = texCoords * texSize - 0.5;

        vec2 fxy = fract(texCoords);
        texCoords -= fxy;

        vec4 xcubic = cubicCat(fxy.x);
        vec4 ycubic = cubicCat(fxy.y);

        vec4 c = texCoords.xxyy + vec2 (-0.5, +1.5).xyxy;

        vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
        vec4 offset = c + vec4 (xcubic.yw, ycubic.yw) / s;

        offset *= invTexSize.xxyy;

        // XXX: texture() needs WebGL2
        // vec4 sample0 = texture(sampler, offset.xz);
        // vec4 sample1 = texture(sampler, offset.yz);
        // vec4 sample2 = texture(sampler, offset.xw);
        // vec4 sample3 = texture(sampler, offset.yw);

        vec4 sample0 = texture2D(sampler, offset.xz);
        vec4 sample1 = texture2D(sampler, offset.yz);
        vec4 sample2 = texture2D(sampler, offset.xw);
        vec4 sample3 = texture2D(sampler, offset.yw);

        float sx = s.x / (s.x + s.y);
        float sy = s.z / (s.z + s.w);

        return mix(
            mix(sample3, sample2, sx), mix(sample1, sample0, sx)
        , sy);
    }

    // This does a cubic interpolation along the y axis (probably strand/particles)
    // but only linear in the x axis (prbobably time)
    // It does not rely on a trick to reduce the number of texture lookups,
    // so requires 4 lookups for 1d cubic interpolation.
    // Exact registration in the y axis is important so that the lookups in y
    // hit exact pixel positions and do not get (effective) linear interpolation.
    // x axis does linear interpolation in the usual way. DO NOT ATTEMPT TO CHANGE IT.
    vec4 textureCubic(sampler2D sampler, vec2 texCoords){
        float texSize = numInstancesP2;
        float invTexSize = 1.0 / texSize;

        float ty = texCoords.y * texSize - 0.5;

        float fy = fract(ty);
        ty -= fy;
        vec4 yc = cubicCat(fy);

        texCoords.y = (ty - 0.5) * invTexSize;
        vec4 s1 = texture2D(sampler, texCoords);
        texCoords.y = (ty + 0.5) * invTexSize;
        vec4 s2 = texture2D(sampler, texCoords);
        texCoords.y = (ty + 1.5) * invTexSize;
        vec4 s3 = texture2D(sampler, texCoords);
        texCoords.y = (ty + 2.5) * invTexSize;
        vec4 s4 = texture2D(sampler, texCoords);
        // if (((by-0.5)-histtime)*(histtime-(by+0.5)) < 0.) s1 = s2;
        // if (((by+1.5)-histtime)*(histtime-(by+2.5)) < 0.) s4 = s3;
        return s1 * yc.x + s2 * yc.y + s3 * yc.z + s4 * yc.w;
    }


    #define histpostBicubic(p,t) textureBicubic(posHist,  vec2(fract(1. + histtime - (t), (p)))
    #define histpostCubic(p,t) textureCubic(posHist, vec2(fract(1. + histtime - (t)), (p)))

    // 'standard' colour, sadly no array for gles 2
    // consider colour lookup texture. (bear in mind how this relates to other colour mapping features...)
    vec3 stdcolX(float tv) {
        // tv = round(tv);
        float k = 1./ceil(tv/7.);
        tv = mod(tv, 7.);
        vec3 col;
        if (tv < 0.) col = vec3(9.5, 0.5, 0.5);  // debug
        else if (tv < 0.5) col = vec3(0.5, 0.5, 0.5);
        else if (tv < 1.5) col = vec3(1,0,0);
        else if (tv < 2.5) col = vec3(0,1,0);
        else if (tv < 3.5) col = vec3(0,0,1);
        else if (tv < 4.5) col = vec3(0,1,1);
        else if (tv < 5.5) col = vec3(1,0,1);
        else if (tv < 6.5) col = vec3(1,1,0);
        else col = vec3(1,1,1);
        return col; //  * k;
    }
    //get colour based on particle position 0..numSegs & given source
    vec3 bedColor(const in float rp) {
        float p = rp; //  / Normalised ToTexCo;
        vec3 rbow = hsv2rgb(vec3(p, 1., 1.)); // vec3(p, 1.-p, 0);
        vec4 bed = texture2D(t_ribboncol, vec2(p, 0.25));
        float t = bed.w;  // t_ribboncol is bed texture, small 'integer' values for now, but mapped to range 0..1
        float ti = t * 255. - 0.0;
        // when BED doesn't have explicit colour, then all elements will be same... that doesn't make this logic right
        // but close enough for now (famous last words), closer with test against green as well
        //PJT::: not so sure about this... trying with just bed...
        float tv = ti; // floor(ti == 0. ? 0. : (mod(ti, 6.) + 1.));
        vec3 col = bed.r != t || bed.g != t ? bed.rgb : stdcolX(tv);
        //vec3 col = bed.rgb;


        // for helix striping
        // if (fract(opos.x*5000. + opos.y) < 0.1) col = std col(6.);

        return col;
    }
        //CSynth.CommonFragmentShaderCode() --------------
`;

CSynth.CommonShaderCode = () => /*glsl*/`
    //CSynth.CommonShaderCode() --------------
    ${CSynth.CommonFragmentShaderCode()}
// in case we're embedded in a THREE shader, avoid re-defining these properties
#ifndef SHADER_NAME
    attribute vec3 position;
    attribute vec2 uv;
#endif
    uniform vec4 _camd;  // camera info in various forms

    // change ooo to work for logarithmic depth; note, shared with threek.vs
    vec4 logdepth (in vec4 ooo) {
        if (USELOGDEPTH > 0.) {
            float z = ooo.w;
            ooo.xy /= z;
            ooo.w = 1.;
            // ooo.z = ( (z - _camd.x) * _camd.y * 2.) - 1.;  // range -1..1
            ooo.z = ( (log(z) - _camd.z) * _camd.w * 2.) - 1.;  // log range -1..1
        }
        return ooo;
    }

    //CSynth.CommonShaderCode() --------------
`;
CSynth.getCommonUniforms = () => {
    const u = window.uniforms;
    adduniform('userPicks', new Array(PICKNUM-16).fill(999), 'fv');

    return {
        scaleFactor: u.scaleFactor,
        scaleDampTarget: u.scaleDampTarget,
        posNewvals: u.posNewvals,
        pickrt: u.pickrt,
        posHist: u.posHist,
        histtime: u.histtime,
        contactbuff: u.contactbuff,
        _camd: u._camd,
        t_ribboncol: u.t_ribboncol,
        t_ribbonrad: u.t_ribbonrad,
        numSegs : u.numSegs, numInstancesP2 : u.numInstancesP2,
        userPicks : u.userPicks,
        HISTLEN : u.HISTLEN,
        USELOGDEPTH : u.USELOGDEPTH
    }
};

var numInstances = 1024, numInstancesP2 = 1024;  //'#'#'#
var low, high;
var springStrengthRatio = 100, baseSpringStrengthRatio = 100;
var threshold = 0;
/** prepare some constants and ready springs */
function DNASprings(xlow, num, thresh) {
    springs.MAXPARTICLES = springs.MAXPARTICLES || maxTextureSize;  // sometimes set too late
    xlow = xlow || 0;
    numInstances = num || numInstances || 128;  //'#'#'#
    threshold = thresh || threshold;
    low = xlow / res;
    high = low + (numInstances - 1) * res;
    if (numInstances > springs.MAXPARTICLES) {
        const n = Math.ceil(numInstances / Math.ceil(numInstances / springs.MAXPARTICLES));
        msgfixlog('numInstances', 'resolution too high', numInstances, 'reduced to', n);
        CSynth.setParticlesDyn(n)
    }
    springs.setPARTICLES(numInstances);
    numInstancesP2 = springs.numInstancesP2;

    // best place for this ??? must be done when no contacts
    adduniform('numSegs', numInstances - 1);
    adduniform('numInstancesP2', numInstancesP2);

    springs.clearall();
    springs.setup();
}

/** core function to create springs from contacts data
 * NOTE, this is obsolete now we have the contact texture map <<<<
 *
 */
CSynth.contactsToSprings = function(contact, plow, num, thresh) {
    if (!CSynth.useOldSprings) return;   // do not create springs this way with new (post Oct 18) model
    if (!contact && CSynth.current) contact = CSynth.current.contacts[0];
    if (!contact) return;
    CSynth.current.selectedSpringSource = CSynth.current.contacts.indexOf(contact);
    minimizeSkelbuffer(numInstancesP2);
    let smsg;
    if (contact === CSynth.current.contacts[0]) smsg = 'using scene1 (red) data';
    else if (contact === CSynth.current.contacts[1]) smsg = 'using scene2 (white) data';
    else smsg = 'using unknown scene data';
    smsg += '  ' + contact.filename;
    if (plow !== undefined) log("XXXXXXXXXX WARNING XXXXXXXXXX plow argument to CSynth.contactsToSprings() currently ignored...");
    low = plow || low;
    numInstances = num || numInstances;
    if (numInstancesP2 !== springs.numInstancesP2) serious('numInstancesP2 wrong');
    threshold = thresh || threshold;
    log('contact springs settings', low, numInstances, numInstancesP2, threshold, G.distanceCompensate, smsg);
    const key = [contact.fid, low, numInstances, threshold, G.distanceCompensate].join('-');
    const c = springs.getSpringCache(key);
    if (c.populated) return;
    c.populated = true;

    springStrengthRatio = baseSpringStrengthRatio * CSynth.current.maxv;

    let mincontactlen = 1;
    if (contact.backbonetype === 'none') {            // just use contacts from file for backbone
    } else if (contact.backbonetype === 'missing') {  // use contacts from file if available, else special
        const cc = CSynth.countContacts(contact);
        for (let p = 1; p < numInstances; p++) {
            if (cc[p] === 0 || cc[p-1] === 0)
                springs.addspring(p, p - 1, 1, 1/baseSpringStrengthRatio, 0);  // backbone for missing
        }
    } else {                                           // use forced backbone and ignore contacts from file
        for (let p = 1; p < numInstances; p++) {
            springs.addspring(p, p - 1, 1, 1/baseSpringStrengthRatio, 0);  // backbone
        }
        mincontactlen = 2;  // we have generated backbone springs so do not use contacts
    }

    // stretch springs, make sure they get a chance
    DNASprings.dostretch();

    let i = 0;
    let slist = [];  // acculumulate potential springs
    const data = contact.data;
    const buckets = {};  // record very rough histogram
    while (i < data.length) {
        const bpa = data[i++];
        const bpb = data[i++];
        //I was getting much larger values of 'na' than 'numInstances'.  Checked what 'low' is
        //and how it's established.  Always 0 in current demos.
        //res is 5000. Not clear why / what that's supposed to mean.
        //now going on the basis of normalising from 0-numInstances, although there may well still
        //be bugs or inconsistencies with some part of how data is laid out.
        //nb, these floats na & nb will be rounded within addspring.
        let na = CSynth.getNormalisedIndex(bpa) * (numInstances - 1);   //bpa/res - low;
        let nb = CSynth.getNormalisedIndex(bpb) * (numInstances - 1);   //bpb/res - low;
        na = nearint(na);
        nb = nearint(nb);
        const prob = data[i++];
        const dist = Math.abs(nb - na);
        if (dist >= mincontactlen && 0 <= na && na < numInstances && 0 <= nb && nb < numInstances) {
            var str = prob * Math.pow(dist, currentGenes.distanceCompensate);
            if (str > threshold) {
                // let d = Math.pow(0.1 * springStrengthRatio/str, 1/4);

                //const ls = Math.log10(str / 0.008);  // << experiment from buckets, useful range 0 for min dist, -1 for max dist
                //const lsr = Math.max(-1, Math.min(0, ls));  // clip to range
                //const d = 1 - lsr*3;

                const d = 1;
                slist.push({ i: na, j: nb, d, str: str / springStrengthRatio });
                const k = (str + 0.00000001 + '').substring(0,6);
                buckets[k] = (buckets[k] || 0) + 1;
            }
        }
    }
    contact.buckets = buckets;
    let nlist = CSynth.use(slist);
    console.log("springs set", nlist.length, 'bad=', slist.length - nlist.length);
}

DNASprings.upforce = 0.1;   // force to encourage centre up
DNASprings.upy = 25;        // point to pull up to
DNASprings.downy = -8;      // y for end pull points (a bit down so object is up)
DNASprings.bpup = 32177300; // 32156304; // 32172487
DNASprings.dostretch = function () {
    if (DNASprings.stretch === false && DNASprings.laststretch === false) return;  // only undo if needed
    DNASprings.laststretch = DNASprings.stretch ;

    const g = currentGenes;
        //return;  // for now
    const sp0 = springs.reserve('stretch', 3);
    const spend = sp0 + 1;
    const spup = sp0 + 2;

    const partup = CSynth.getPartposFromBP(DNASprings.bpup);

    // we do the fix anyway, they may not be used if no stretch
    springs.setfix(sp0, -g.springspreaddist / 2, DNASprings.downy, 0);
    springs.setfix(spend, g.springspreaddist / 2, DNASprings.downy, 0);  // out to right
    springs.setfix(spup, 0, DNASprings.upy, 0);  // above

    //springs.setfix(0, -12,0,0);
    //springs.setfix(numInstances-1, 12 ,0,0);  // out to right

//    springs.removespring(0, sp0);
//    springs.removespring(numInstances - 1, spend);
    const springop =  DNASprings.stretch ? springs.addspring : springs.removespringF;

    springop(0, sp0, 0, g.springspreadforce, g.springspreadpow);  // stretch
    springop(numInstances - 1, spend, 0, g.springspreadforce, g.springspreadpow);  // stretch

    if (DNASprings.lastpartup !== partup) {
        springs.removespring(DNASprings.lastpartup, spup);
        DNASprings.lastpartup = partup;
    }
    if (0 <= partup && partup < numInstances)  // could warn here, if we really want an up particle we should set it
        springop(partup, spup, 0, DNASprings.upforce, 0);  // stretch

    if (CSynth.xyzfixed) {  // ends defined by the complete fixed set
    } else if (DNASprings.fixends) {
        springs.setfix(0,  -g.springspreaddist / 2, 0, 0);
        springs.setfix(numInstances - 1,  g.springspreaddist / 2, 0, 0);
    } else {
        springs.removefix(0);
        springs.removefix(numInstances - 1);
    }
}

function setthresh(v, contacts) {
    threshold = v;
    CSynth.contactsToSprings(contacts);
    if (W.threshslide && W.threshslide.value !== v)
        W.threshslide.value = v;
}

var customSettings = ()=>{};

CSynth.applyContacts = (contacts, pftype = CSynth.springSettings.contactFtype) => {
    const ftype = (pftype.toLowerCase().indexOf('lor') === -1) ? 'contact' : 'contactLor';
    const cc = CSynth.current;
    if (contacts === undefined) contacts = cc.selectedSpringSource;
    if (typeof contacts === 'number') contacts = cc.contacts[contacts];
    if (!contacts) {
        log("No contacts specified for CSynth.applyContacts()");
        return;
    }
    const cn = cc.contacts.indexOf(contacts);
    if (cn !== -1) ftype === 'contactLor' ? CSynth.pressLorDG(cn) :  CSynth.pressCsynth(cn);
    // currentGenes.stepsPerStep = 2;
    // GX.restoregui('contact.settings');  // no op if non saved
    CSynth.switchSpringSettings(ftype);

    if (CSynth.useOldSprings) setthresh(W.threshslide.value, contacts); // calls CSynth.contactsToSprings
    CSynth.xyzClear();
    CSynth.current.selectedSpringSource = CSynth.current.contacts.indexOf(contacts);
    //PJT rather than pass texture directly to uniforms.contactbuff.value, pass contacts object
    //allowing methods etc to be accessed from a springs instance.
    //....of course, this method isn't even being used... need to ook at applyXyzs
    //if (G.contactforce) uniforms.contactbuff.value = CSynth.contactsToTexture(contacts);
    if (G.contactforce) springs.contacts = CSynth.getContactsZZ(contacts);

    //G.pushapartforce *= 10;
    //setTimeout(()=> G.pushapartforce /= 10, 4000);
}

/** clear all springs except backbone springs */
function loadfree() {
    if (!CSynth.current.contacts[1]) return;
    CSynth.contactsToSprings(0, 0, 0, 10000);  // lazy way to force no springs
    CSynth.xyzClear();
}

/** go to the open helix position, try to settle and the then object should fold from there */
function loadopen() {
    // uniforms.stepsSoFar.value = 0;           // TODO to remove Oct 2020
    target = {};
    CSynth.xyzClear();
    DNASprings.dostretch();
    const sc = G.springlen / 32.42 * numInstances * 5;
    springs.loadopen({sc});
    onframe(() => {
        DNASprings.dostretch();
        springs.loadopen({sc});
        // springs.step(1);
        // springs.settleHistory();
        // springs.step(1);
    }, 1);
    onframe(() => centrescalenow(), 2);
}

/** restore after stretching ... still possible timing errors  */
CSynth.restorewide = function() {
    if (CSynth.widesave) {
        copyFrom(G, target); target = {};  // respect target but allow ourselves to overwrite it
        let tout;  // timeout const will also be restored
        // restore all settings to orignal values
        const g = G;
        [g.maxBackboneDist, g.springspreaddist, g.pushapartforce, g.pushapartlocalforce, DNASprings.fixends,
            DNASprings.stretch,  g.noiseforce, g.springforce, g.xyzforce,
            g.contactforce, g.damp, DNASprings.upforce, g.stepsPerStep, tout]
         = CSynth.widesave;
        clearTimeout(tout);  // probably already have been cleared, but just in case
        const oss = G.stepsPerStep;        // original (saved) stepsPerStep
        G.stepsPerStep = Math.max(oss, 20);  // give it a little umph to reestablish itself
        S.ramp(G, 'stepsPerStep', oss, 8000);  // but gradually back to starting stepsPerStep once it has
        const odamp = G.damp;           // original (saved) damp
        G.damp = CSynth.fastdamp;                    // give it a little umph to reestablish itself
        S.ramp(G, 'damp', odamp, 8000);  // but gradually back to starting damp once it has
        // setTimeout( () => G.stepsPerStep = origStepsPerStep, 4000); // but back to starting stepsPerStep once it has
    }
    CSynth.widesave = undefined;
}

/** load a very stretched version */
function loadwide() {
   //CSynth.applyXyzs('..spread..');
   let savenoise = G.noiseforce;
   if (!CSynth.widesave) {
        // settings below will take hold in 8 seconds after the spread is more or less complete
        const tout = setTimeout( () => { target.damp = 0.9; target.stepsPerStep = 2; target.noiseforce = savenoise; }, 8000);
        // save any settings that may be disturbed by the wide sequence
        const g = G;
        CSynth.widesave =
        [g.maxBackboneDist, g.springspreaddist, g.pushapartforce, g.pushapartlocalforce, DNASprings.fixends,
            DNASprings.stretch,  g.noiseforce, g.springforce, g.xyzforce,
            g.contactforce, g.damp, DNASprings.upforce, g.stepsPerStep, tout]
}
   // G.maxBackboneDist = 1.1/numInstances;  // so we only use backbone springs
   S.ramp(G,  'maxBackboneDist', 1.1/numInstances, 2000, 0,0, S.log)
   target.springspreaddist = CSynth.current.numInstances * 1.4 * G.springlen; // ?? * G.springlen
   DNASprings.fixends = true;
   DNASprings.stretch = true;
   target.noiseforce = 0;
   target.springforce = 0.9;
   // target.pushapartforce = G.pushapartforce * 0.1; // too big and it stretches the entire chain

   DNASprings.upforce = 0; // 0.1;  probably need this when repositioning but not during spread, where it can make a kink?
   target.stepsPerStep = Math.max(G.stepsPerStep, 0.1 * CSynth.current.numInstances);
   target.stepsPerStep = Math.min(target.stepsPerStep, 10);
   target.xyzforce = G.xyzforce * 0.8;  // this is curiously critical for rsse between 0.8 and 1
   target.pushapartlocalforce = 0;
   target.pushapartforce = 0;
   target.damp = CSynth.fastdamp;
}
CSynth.fastdamp = 0.9999;


CSynth.switchSpringSettings = function(ftype) {
    const eg = {
        xyz: ['xyzforce'],
        contact: ['contactforce', 'contactforcesc', 'pushapartforce', 'pushapartpow'],
        contactLor: ['m_force', 'm_alpha', 'm_c', 'm_k']
    };
    for (let type in eg) {
        const l = eg[type];
        l.forEach(gn => {
            if (type === ftype)
                CSynth.enable(gn)
            else
                CSynth.disable(gn)
        })
    }
    CSynth.springSettings.current = ftype;
    return;

    // // save the current working set
    // if (CSynth.springSettings.current)
    //     CSynth.springSettings[CSynth.springSettings.current] =
    //         objfilter(G, (v,gn) => genedefs[gn] && genedefs[gn].tag === 'springs');

    // // and restore the new working set
    // const nset = CSynth.springSettings[ftype];
    // if (nset) {
    //     copyFrom(currentGenes, nset);
    //     CSynth.springSettings[ftype] = undefined;
    // } else {
    //     msgfixerror('spring settings', 'unexpected change to', ftype);
    // }
    // CSynth.springSettings.current = ftype;
}


/** create springs from coordinate data, use cache if possible */
CSynth.applyXyzs = (xyzstruct) => {
    const cc = CSynth.current;
    CSynth.switchSpringSettings('xyz');

    if (typeof xyzstruct === 'number') {
        const tryid = cc.xyzs[xyzstruct];  // struct if input was id
        if (tryid) xyzstruct = tryid;
    }
    const cn = cc.xyzs.indexOf(xyzstruct);
    if (cn !== -1) CSynth.pressDist(cn); //this will call applyXyzs() again but prevent any further recursion.

    CSynth.xyzClear();
    target = {};
    const filename = xyzstruct.filename;
    // log('load springs', filename);
    CSynth.current.selectedSpringSource = CSynth.current.contacts.length + CSynth.current.xyzs.indexOf(xyzstruct);

    // strecth springs first to make sure they are used
    DNASprings.dostretch();

    if (G.springforce && CSynth.useOldSprings) {
        // todo, more complete key ???  Also follow through whether filename is a filename or a structure
        let key = [xyzstruct.filename || filename, xyzstruct.average, xyzstruct.model, G.xyzMaxDist, G.makexyzSpringStrength].join('/');
        const c = springs.getSpringCache(key);
        if (c.populated) return;
        c.populated = true;

        // const xyzbundle = CSynth.parseXYZ(xyzstruct);
        const p = xyzstruct.coords;
        CSynth.xyzsToSprings(p);  // do not return anything
    }


    //if (G.xyzforce) {  // apply anyway, may be needed for matrix colour
        uniforms.distbuff.value = CSynth.xyzToTexture(xyzstruct); //consider making interface for this on springs
    //}
}

/** use the xyz fixed position data to create a spring model ... TODO pass in structure and save recomputation of mind */
CSynth.xyzsToSprings = function(p) {
    if (!CSynth.useOldSprings) return;  // do not create springs this way with new (post Oct 18) model

    // then main body of springs
    let slist = [];
    let mind = 1e40, maxstr = 0;
    for (let bd = 1; bd < numInstances - 1; bd++) {  // start at backbone and work out
        for (let i = 0; i < numInstances - bd; i++) {
            let j = i + bd;
            const a = p[i], b = p[j];
            const d = Math.sqrt( (a.x-b.x) * (a.x-b.x) + (a.y-b.y) * (a.y-b.y) + (a.z-b.z) * (a.z-b.z));
            mind = Math.min(d, mind);
            // let d = p[i].distanceTo(p[j]);
            if (d < G.xyzMaxDist) {
                let str = G.makexyzSpringStrength/d; //  / bd;  // odd formula, but works for now
                maxstr = Math.max(maxstr, str);
                slist.push({ i, j, d, str });
            }
        }
    }
    slist.forEach( v => v.str *= 1/baseSpringStrengthRatio/maxstr );  // scale compatibly with contacts, not sure why need scale UP by 100

    let nlist = CSynth.use(slist);
    log('created springs: thresh', G.xyzMaxDist, 'strength', G.makexyzSpringStrength, 'num', nlist.length, 'bad', slist.length - nlist.length, 'mind', mind);
    return slist;
}

/** create springs from two sets of coordinate data, and generate cache */
CSynth.xyzSpringsPair = (o, step, start) => {
    // todo, more complete key ???
    o = o || {};
    o.filename1 = o.filename1 || CSynth.current.xyzs[0].filename;
    o.filename2 = o.filename2 || CSynth.current.xyzs[1].filename;
    o.average = o.average || 1;
    let key = [o.filename1, o.filename2, o.average, G.xyzMaxDist, G.makexyzSpringStrength].join('/');
    const c = springs.getSpringCache(key);
    if (c.populated) return;
    c.populated = true;

    const p1 = CSynth.parseXYZ(CSynth.current.xyzs[0]).coords;
    const p2 = CSynth.parseXYZ(CSynth.current.xyzs[1]).coords;

    // stretch springs first to make sure they are used
    DNASprings.dostretch();

    // then main body of springs
    let slist = [];
    for (let bd = 1; bd < numInstances - 1; bd++) {  // start at backbone and work out, backnone distance
        for (let i = 0; i < numInstances - bd; i++) {
            let j = i + bd;
            let d1 = p1[i].distanceTo(p1[j]);
            let d2 = p2[i].distanceTo(p2[j]);
            let d = Math.min(d1, d2);           // geometric distance
            if (d < G.xyzMaxDist) {
                let str = G.makexyzSpringStrength / d;   // <<< bd for old style
                slist.push({ i, j, d, str, d1, d2 });
            }
        }
    }
    let nlist = CSynth.use(slist);
    c.slist = nlist;

    // collect distance values for springs used
    for (let s = 0; s < nlist.length; s++) {
        let ss = nlist[s];
        let i = ss.i, j = ss.j;
        let slot1 = springs.findslot(i, j);
        if (slot1 === -1) serious('slots wrong');
        ss.slot1 = slot1;
        let slot2 = springs.findslot(j, i);
        if (slot2 === -1) serious('slots wrong');
        ss.slot2 = slot2;
        ss.d1 = p1[i].distanceTo(p1[j]);
        ss.d2 = p2[i].distanceTo(p2[j]);
    }
    log('created springs: thresh', G.xyzMaxDist, 'strength', G.makexyzSpringStrength, 'num', slist.length, 'bad', slist.length - nlist.length);
    return c;
}

// for smooth transition
// v=0; t=5000; s=100/t; for(i=0; i<1; i+=s) setTimeout( ()=>CSynth.xyzSpringsMix(v += s), i*t)

/** used the merged spring pairs to make averaged springs
if n is given  then only n springs are set in round-robin
*/
/**
CSynth.xyzSpringsMixNOTRIGHT = function (k, n, o, step, start) {
    let c = CSynth.xyzSpringsPair(o, step, start);
    let ta = springs.topologybuff.image.data;
    for (let s = 0; s < c.slist.length; s++) {
        let ss = c.slist[s];
        let d = k * ss.d1 + (1 - k) * ss.d2;
        ta[ss.slot1 + 1] = d;	// d = len
        ta[ss.slot2 + 1] = d;
        let bd = ss.j - ss.i;
        let str = G.makexyzSpringStrength / d;  // / bd for old style
        ta[ss.slot1 + 2] = str;	// d = len
        ta[ss.slot2 + 2] = str;
    }
    springs.topologybuff.needsUpdate = true;
}
**/

/** if called, mix springs each step between first two established
use switching between the two, does NOT work well, unstable at inbetween values.
gives some interesting oddities at say G.springredprop = 0.99, G.stepsPerStep=20 */
CSynth.xyzSpringsSwitchOBSOLETE = function (go = true) {
    let n = 0;  // number of calls
    let lasti;
    if (go) {
        if (CSynth.xyzSpringsMix.go) return;  // already going
        CSynth.xyzSpringsMix.go = Maestro.on('prespringstep', choose);
        n = 0;
    } else {
        Maestro.remove('prespringstep', CSynth.xyzSpringsMix.go);
        CSynth.xyzSpringsMix.go = 0;
    }
    function choose() {
        n++;
        let newi = Math.round(G.springredprop * n);
        let opt = newi === lasti;
        lasti = newi;
        CSynth.applyXyzs(CSynth.current.xyzs[opt ? 0 : 1].filename);
    }
}


/** make springs in strength order */
CSynth.use = function (slist) {
    if (slist.length === 0) return [];
    log(`sorting ${slist.length} strings`);
    slist.sort((a, b) => a.str < b.str ? 1 : -1);
    log(`setting ${slist.length} strings`);
    let nlist = [];
    for (let i = 0; i < slist.length; i++) {
        let a = slist[i];
        let bad = springs.addspring(a.i, a.j, a.d, a.str, a.pow);  // probably no a.pow
        if (!bad) nlist.push(a);
    }
    const highstr = nlist[0].str;
    const lowstr = nlist[nlist.length-1].str;
    log(`ordered strings used ${nlist.length} unused ${slist.length - nlist.length} strengths: highest=${highstr} lowest=${lowstr} range=${highstr / lowstr} `);
    return nlist;
}

CSynth.xyzSpringsRed = () => { if (CSynth.current.xyzs[0]) CSynth.applyXyzs(CSynth.current.xyzs[0]);
    else CSynth.applyContacts( CSynth.current.contacts[0]); }
CSynth.xyzSpringsWhite = () => { if (CSynth.current.xyzs[1]) CSynth.applyXyzs(CSynth.current.xyzs[1]);
    else CSynth.applyContacts( CSynth.current.contacts[1]); }

let springguiHTMLAdded = false;

/** start CSynth demos just once (merge with init????) */
CSynth.startdemo = function() {
    if (!uniforms.t_ribboncol) adduniform('t_ribboncol', undefined, 't');
    if (!uniforms.t_ribbonrad) adduniform('t_ribbonrad', undefined, 't');
    if (!uniforms.matrixbed) addtaggeduniform('matrix', 'matrixbed', undefined, 't');
    onframe( () => currentGenes.USELOGDEPTH = 0, 2 );  // do not use log depth until we make it compatible with controllers etc
    inmutator = window.horn;

    CSynthFast |= navigator.userAgent.contains('Android');  // ?? iPhone
    if (CSynthFast) {
        //simpleset();
        CSynth.Matrix.res = 4;
        //W.renderMainObject = false; // no, kills matrix, tbd
        //startscript = "CSynth/data/loadpolymer.js"
        THREE.SKIPINSTANCES = true;
        THREE.LinearFilter = THREE.NearestFilter; // overkill
        shadows(0);
        setInput(W.renderRatioUi, 2);
        usemask = 0;
        //setInput(SIMPLESHADE, true);
        //?? V.nocamscene.visible = false
        // CSynth.annotationGroup.visible = false

    }

    //W.springgui was undefined even second time through, not sure why...
    if (!springguiHTMLAdded) {
        addfragment('CSynth/springgui.html');
        springguiHTMLAdded = true;
        if (oxcsynth)  // fornow: load even for oxcsynth, but hide
            document.getElementById('springgui').style.display = 'none';
    }

    if (startscript) { //
    } else {
        startscript = 'CSynth/data/noConfig.js';
        try {
            startWsListener();
        } catch (e) {
            console.error('could not start websocket listener', e);
        }
    }
    //else if (oxcsynth && location.href.indexOf('/rev') !== -1) startscript="../data/Crick/loadcrick_600kb.js";
    //else if (oxcsynth) startscript = "CSynth/data/rsse/loadrsse.js";
    //else startscript = "CSynth/data/loadPostRsse.js";

    addgeneperm("distanceCompensate", 0, 0, 1, 0.1, 0.01, "power for distance compensation, 0 none, 1 exaggerate by distance", "springs", "frozen");
    addgeneperm("makexyzSpringStrength", 1, 0, 1, 0.1, 0.01, "strength for making spring from coord data", "springs", "frozen");

    addgeneperm("springspreadforce", 0.001, 0, 0.1, 0.0001, 0.001, "strength for stretching springs", "springs", "frozen");
    addgeneperm("springspreadpow", 0.01, 0, 0.1, 0.0001, 0.001, "power for stretching springs falloff", "springs", "frozen");
    addgeneperm("springspreaddist", 30, 0, 500, 10, 1, "distance for stretching springs", "springs", "frozen");

    addgeneperm("springredprop", 0, 0, 1, 0.1, 0.01, "proportion of red springs to use if mixing", "springs", "frozen");

    addgeneperm("cubicCatS", 0.5, 0, 1, 0.1, 0.01, "CatMull-Rom s factor", "springs", "frozen");


}

/** create a config structure for a drop list that does not include a config file */
CSynth.handlefileset = function(evt, data) {
    log ('CSynth.handlefileset', evt, data);
    const files = Array.from(evt.eventParms);
    const o = {   // config file in waiting
        filename: 'auto:' + getFileName(files[0].canonpath),
        dir: '',
        fullDir: '',
        currentLoadingDir: '',
        contacts: [],
        xyzs: [],
        beds: [],
        wigs: [],
        matchPairs: true

    };
    for (let i=0; i < files.length; i++) {  // do NOT use files.forEach as the .js return case does not return far enough
        const file = files[i];
        const path = file.canonpath;
        const ext = getFileExtension(path);
        switch(ext) {
            case '.js':
            case '.config':
                log('handlefileset, drop list included a config file, no auto config needed', path);
                return;  // already have a config file, nothing for us to do
            case '.contacts':
            case '.txt':
            case '.mat':
            case '.zip':
            case '.csv':
            case '.bintri':
                o.contacts.push(path);
                break;
            case '.xyz':
            case '.pdb':
            case '.vdb':
            case '.json':
                o.xyzs.push(path);
                break;
            case '.bed':
                o.beds.push(path);
                break;
            case '.wig':
                o.wigs.push(path);
                break;
            case '.tif':
            case '.map':
                o.imagetiff = path;
                break;
            default:
                log('handlefileset, file not used for auto configuration:', path);
                break;
        }
    }
    if (o.contacts.length + o.xyzs.length > 0) {
        log('handlefileset, auto config generated as no config file');
        springdemo(o);
    } else {
        log('handlefileset, no special files so handle files individually');
    }

}

Maestro.on('preopenfiles', CSynth.handlefileset);


// list of objects to use for settintgs
CSynth.settingsList = [CSynth, currentGenes, V, VH];

// find object for a given setting ... NOT the value of the object
CSynth.settingsObject = function(k) {
    const l = [CSynth, currentGenes, V, VH]; // CSynth.settingsList;
    for (let i = 0; i < l.length; i++)
        if (k in l[i]) return l[i];
}

// SS is convenience setting/getting object
var SS = new Proxy({}, {
    get : (ig, name) => {
        const o = CSynth.settingsObject(name);
        const r = name === 'ownKeys' ?
            () => Reflect.ownKeys(uniforms) :
            o ? o[name] : undefined;
        return r;
        },
    set : (ig, name, v) => {
        const o = CSynth.settingsObject(name);
        if (o) {
            o[name] = v;
            return true;
        } else {
            log(`No object ${name} for S`);
            return false;
        }
    },

    ownKeys : (o) => {
        let x = Reflect.ownKeys(uniforms);
        // log('...', x);
        return x;
    }   // Object.keys(U) calls this, and x is ok, but returns []
    // !!! enumerate maynot work ...
 });

/** process settings */
CSynth.processSettings = function(s) {
    if (!s) return;
    const wrong = [];
    for (let k in s) {
        const o = CSynth.settingsObject(k);
        if (o)
            o[k] = s[k];
        else
            wrong.push(k);
    }
    if (wrong.length)
        msgfixerror('unknown settings', wrong);
}

/** run a springdemo for a new set of definitions/config file */
async function springdemo(defs) {
    loadTime('model 1 springdemo start');
    slowinit.pendend.springgdemo = 'set by springdemo at ' + Date.now();
    if (defs.check === undefined) defs.check = true;
    springdemo.defs = defs;

    // initialize these
    // note the user may overwrite them after initial call to springdemo is complete
    // but before timeout recalls to CSynth.springdemoinner are complete
    CSynth.defaultCamera = new THREE.Vector3(0, -200, 600);
    customSettings = () => CSynth.processSettings(defs.customSettings);
    customLoadDone = CSynth.customReset = nop;
    CSynth.orient.up = CSynth.orient.right = undefined;
    if (uniforms.killrads) uniforms.killrads.value.fill(-999);
    defs.strandContacts = [];
    if (CSynth.rawgroup) {
        V.rawscene.remove(CSynth.rawgroup);
    } else {
        Maestro.on('preframe', () => {
            const k = G.scaleFactor;
            CSynth.rawgroup.scale.set(k,k,k);
        });
    }
    CSynth.rawgroup = new THREE.Group();
    CSynth.rawgroup.name = 'rawgroup';
    V.rawscene.add(CSynth.rawgroup);

    // msgfix('rmse');  // to not try to compute during
    msgfix.killMost(['fff']);  // kill all messages except file list
    // TODO remove relevant Maestro items here

    if (currentLoadingData && !defs.configData) defs.configData = currentLoadingData;
    if (defs.currentLoadingDir === undefined) defs.currentLoadingDir = currentLoadingDir;
    defs.currentLoadingFile = currentLoadingFile;
    await CSynth.springdemoinner(defs);

    /***
     * regular canvas.onwheel -> canvwheel -> applyScale -> G._camz
     * regular centre button zoom -> canvmousemove -> applyMatop -> zoom -> G._uScale
     * Not sure why this behavious was not fine for CSynth, sjpt 19/11/2018
     * *** This was so we could enlarge object without changing matrix; also broken in scaleFactor slider
     * and why we implemented this special case.
     * This special case below is very bad for objects that are not centred.
    ****/
    canvas.onwheel = function (evt) {
        // applyScale does not use pow
        var wheelk = 1.1;
        // wheelDelta for Chrome etc, deltaY for Firefoxx
        var d = evt.wheelDelta ? evt.wheelDelta/120 : evt.deltaY;
        var sc = Math.pow(wheelk, d);
        G.scaleFactor *= sc;
        // not quite right below, ??? todo stephen 17/10/18
        const e = G._rot4_ele;
        const m3 = new THREE.Matrix3(), v3 = new THREE.Vector3();
        m3.set(e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]);
        v3.set(e[3], e[7], e[11]);
        v3.applyMatrix3(m3.transpose()).multiplyScalar(sc).applyMatrix3(m3.transpose());
        e[3] = v3.x;
        e[7] = v3.y;
        e[11] = v3.z;
    }
    /****/
}

// auto scale.  note, we are autopanning so the scaleDampTarget1 will be up to date
CSynth.autoscale = function(trimp = 0.1) {
    let p = springs.getpos();
    p = p.slice(numInstances*trimp, numInstances*(1-trimp))
    G.scaleFactor = (CSynth.autoscaleFactor / Math.sqrt(Math.max(...CSynth.stats(p).eigenvalues)));
}
CSynth.autoscaleFactor = 250;

CSynth.separateRepresentatives = 'none';
CSynth.representativeSources = 'none meanv meanndv meannzv maxv wmeandistC meandistC wmeandist meandist'.split(' ')

/** run a springdemo for a new set of definitions/config file,
 * If we are doing async loading wait till all parts ready before doing real work.
 */
CSynth.springdemoinner = springdemoinner;
async function springdemoinner(defs) {
    if (!defs) serious('springdemo must be called with defs');
    // VH.killgui();  // force regeneration of the menu for new settings
    // defs.currentLoadingDir = currentLoadingDir;

    uniforms.t_ribbonrad.value = undefined;  // unless set again
    uniforms.matrixbed.value = uniforms.t_ribboncol.value = undefined;
    CSynth.files._activebed = undefined;
    if (uniforms.matrixbed) uniforms.matrixbed.value = undefined;
    if (uniforms.matrix2dtexA) uniforms.matrix2dtexA.value = undefined;
    if (uniforms.matrix2dtexB) uniforms.matrix2dtexB.value = undefined;

    defs.MAX_DEFS_PER_PARTICLE = ((defs && defs.MAX_DEFS_PER_PARTICLE) || 256);  // allow LOTS of springs from each particle
    springs.setMAX_DEFS_PER_PARTICLE(defs.MAX_DEFS_PER_PARTICLE);
    const ret = await CSynth.loadData(defs, currentLoadingFile);
    if (ret === 'incomplete') {
        setTimeout(() => CSynth.springdemoinner(defs), 250);
        return;
    }

    // uniforms.stepsSoFar.value = 0;  // early in case explicitly overridden
    const toload = () => CSynth.twist({sc:2 * G.backboneScale * springs.numInstances**(1/3)}); // was loadopen
    toload();
    onframe(toload, 2);   // in case springs are reconfigured and thus reset
    updateGuiGenes();
    currentGenes.stepsPerStep = 2;

    springs.start();
    if (W.showsprings) showsprings.startanim();
    //    setTimeout(rerun, 50);  // todo find out why this is needed
    const baselen = uniforms.t_ribbonrad.value ? uniforms.t_ribbonrad.value.image.width : 10000; // << could also use other things for dynamic choice such as # particles
    // let lennum = Math.floor(baselen  / (1 - G.capres));
    let lennum = isNaN(numInstances) ? 1000 : Math.max(numInstances * 10, 10000);
    let radnum = 19;
    if (CSynthFast) { lennum = numInstances; radnum = 5; }
    HW.resoverride = { lennum, radnum, skelends: 0, skelnum: numInstances - 1 }

    // tidy up the graphics, there may be other bits that need similar change
    if (VH.SphereParticles)
        VH.SphereParticles.setInstances();

    DNASprings();       // set up a few spring details such as numInstances
    const cc = CSynth.current;
    if (cc.fixedPoints) CSynth.loadFixedPoints(cc.fullDir + cc.fixedPoints);

    CSynth.useExtraContacts();
    function startrun() {    // defer this in case customSettings refers t details not yet set up

        if (CSynth.objectSavePending) { onframe(startrun); return; } // don't start till save complete

        // set up default values for the different spring settings
        CSynth.springSettings = {
        //     contact: {xyzforce: 0, contactforce: 80, pushapartforce: 0.0002, m_force: 0},
        //     contactLor: {xyzforce: 0, contactforce: 0, pushapartforce: 0, m_force: 1, pushapartlocalforce: 0, backboneforce: 0},
        //     xyz: {xyzforce: 0.1, contactforce: 0, pushapartforce: 0, m_force: 0}
        };
        // for (let ftype in CSynth.springSettings) {
        //     let ok = GX.restoregui(ftype + '.settings', undefined, true);  // no op if non saved
        //     if (ok) CSynth.springSettings[ftype] = objfilter(G, (v,gn) => genedefs[gn] && genedefs[gn].tag === 'springs');
        // }
        CSynth.springSettings.current = undefined;
        CSynth.springSettings.contactFtype = 'contact';

        customSettings(defs);
        if (defs.contacts[0]) {
            // CSynth.contactsToSprings(defs.contacts[0], low, numInstances, threshold);
            CSynth.applyContacts(0);
        } else if (defs.xyzs[0]) {
            CSynth.applyXyzs(defs.xyzs[0])
        } else {
            msgfixerror('no contacts/xyzs', 'data loaded but no contacts or xyzs defined');
        }

        onframe(()=>Maestro.trigger('demoready'), 2);
        // onframe(()=>Gldebug.start(2), 10);      // run a short gldebug test, this will report errors
    }

    if (numInstances === -1) serious('Cannot run system as no instances set');


    await CSynth.makegui(true);  // remake now we have new data
    VH.positionGUI();

    /** refresh the stretch and a few other details each frame in case values have changed  */
    Maestro.onUnique('prespringstep', () => {
        const _cc = CSynth.current;
        if (!_cc.contacts) return;
        DNASprings.dostretch();
        if (G.contactforce !== 0) {
            //PJT: cc.contacts empty array?
            const contacts = _cc.contacts[_cc.selectedSpringSource];
            if (contacts && !contacts.texture) {
                CSynth.applyContacts(contacts);
            }
        }

        let repv = _cc.representativeContact;  // unless set otherwise
        const ccc = _cc.contacts[_cc.selectedSpringSource];
        const ccc0 = _cc.contacts[0];
        const reps = CSynth.separateRepresentatives;  // representative source
        let ifrat;
        if (ccc && reps !== 'none') {
            let ccv = CSynth.getProperty(ccc, reps);
            let c0v = CSynth.getProperty(ccc0, reps);
            if (reps.endsWith('dist')) {
                geneOverrides.scaleFactor = G.scaleFactor * ccc0[reps] / ccc[reps];
                ifrat = 1;
            } else {
                ifrat = ccv / c0v;
                delete geneOverrides.scaleFactor
                repv *= ifrat;
            }
            msgfix('autoscales', `IF scale ${ifrat}, distScale ${GO.scaleFactor/G.scaleFactor}`)

        }
        uniforms.representativeContact.value = repv;

        if (G.contactforce === 0 || _cc.representativeContact === 0 || _cc.contacts.length === 0) {
            G.contactforcesc = 0;
        } else {
            G.contactforcesc = G.contactforce * 1e-6 / repv;
        }

        // this was added without allowing for geneGoverrides in rev 8126, 7 Aug 2020, no indication why needed.
        // this broke lorentz example; no comment as to what it fixed or why it was needed
        // corrected to allow for geneOverrides, 9 April 2021
        uniforms.contactforcesc.value = ('contactforcesc' in geneOverrides ? geneOverrides : G).contactforcesc;

        if (_cc.contacts.length === 0 && G.xyzforce === 0 ) G.xyzforce = 0.5;
        if (!U.distbuff) G.xyzforce = 0;
    });

    // everything is settled, do any specific overrides the user wants
    // but wait one frame in case custom values defined after springdemo
    // and springdemo is synchronous, so they won't be defined quite yet.
    onframe( ()=> {
        startrun();

        // msgboxVisible(false);        // no message box when all loaded ok
        CSynth.autoDefaults();          // these are the defaults that depend on details such as numInstances
        CSynth.defsSettings(defs);
        customSettings(defs);
        customLoadDone(defs);
        updateGuiGenes();  // make sure genes showing right
        const is = settings || searchValues.settings;
        if (is) processFile(CSynth.current.fullDir + is);
        GX.savegui(GX.localprefix + 'initial.settings');
        GX.savegui(GX.localprefix + '!auto.settings');
        CSynth.current.ready = true;
    });

    if (searchValues.runs) {
        onframe( async function autoruns () {
            await CSynth.saveRuns({nruns:searchValues.runs});
            window.close();     // will often fail
            location.href = 'literal.html?saveRuns%20complete'
        }, 10);
    }
    if (searchValues.wsListenerPort)
        startWsListener(searchValues.wsListenerPort);

}

/** return reps value from contact, with some jit evaluation if needed */
CSynth.getProperty = function(cccx, reps) {
    let repvt = cccx[reps];
    // if (!repvt && ['wmeandist', 'meandist', 'meanndv'].includes(reps))
    if (!repvt && reps === 'meannzv')
        cccx.meannzv = cccx.nonz === 0 ? 0 : cccx.sumv/cccx.nonz;
    else if (!repvt && reps.includes('mean'))
        CSynth.meandists(cccx);
    if (!(reps in cccx))
        serious('bad choice for CSynth.separateRepresentatives', reps);
    return cccx[reps];
}


function highres() {
    let lennum = Math.floor(uniforms.t_ribbonrad.value.image.width / (1 - G.capres));
    lennum = Math.max(lennum, 5000);
    HW.resoverride = { lennum, radnum: 19, skelends: 0, skelnum: numInstances - 1 }
    shadows(7);  //  probably overkill
    setSize();
}
function lowres() {
    HW.resoverride = { lennum: 200, radnum: 3, skelends: 0, skelnum: numInstances - 1 }
    shadows(0);
    cMap.updateRate = 1e20;  // should really not be being used anyway
    setSize(512, 512);
    fitCanvasToWindow();
}

function addfragment(fid) {
    var dir = inmutator ? './' : '../';
    var data = getfiledata(dir + fid);
    if (inmutator) data = data.split('src="').join('src="CSynth/');
    var temp = document.createElement('template');
    temp.innerHTML = data;
    document.body.appendChild(temp.content);

}

/** debug the registration of the spring particles with the skeleton */
CSynth.debugSprings = function () {
    let fl = 2; // format length
    let pp = format(readWebGlFloat(springs.posNewvals, { mask: 'x', height: numInstances }), fl);
    //let bb = format(readWebGlFloat(skelbuffer)[0], 4);
    let bb = readWebGlFloat(skelbuffer, { mask: 'x', width: numInstances });
    for (let i = 0; i < bb.length; i++) bb[i] /= 20;
    bb = format(bb, fl);
    if (pp !== bb) log('>>>>>>>>>>>>>>>>>>>>>>>>> mismatch')
    log('springs ', pp);
    log('skeleton', bb);
    log('>>>>>>>>>>>>>>>>>>>>>>>>>', pp === bb ? 'match OK' : 'mismatch')
}

/** checks i almost integer, and returns integer */
function nearint(i) {
    const ii = Math.round(i);
    if (Math.abs(i - ii) > 0.01)
        console.error('expected integer and got', i);
    return ii;
}

/** show usage of pick slots for CSynth */
//CSynth.pickslots; //  = { 0: 'l-ribbon', 4: 'l-matrix1', 5: 'l-matrix2', 8: 'r-ribbon', 12: 'r-matrix1', 13: 'r-lmatrix2', 16: 'user0', 17: 'user1', 18: 'user2', 19: 'user3' };
CSynth.picks = {};

/** show used part of pick in CSynth units */
CSynth.showpick = function (callback) {
    if (!CSynth.current || !CSynth.current.ready) return;
    // ??? if (!renderMainObject && !VH.matrix.visible) return;   // don't pick if no
    const markers = CSynth.markers;

    if (renderVR.invr() && !V.BypassLeftLaser)
        CSynth.pickslots = ['l-ribbon', 0,0,0,
            'l-matrix1', 'l-matrix2', 0,0,
            'r-ribbon',0,0,0,
            'r-matrix1', 'r-matrix2',0,0];
    else
        CSynth.pickslots = ['ribbon', 0,0,0,
            'matrix1', 'matrix2', 0,0,
            'g-ribbon',0,0,0,
            'g-matrix1', 'g-matrix2',0,0];
    markers.forEach(m => CSynth.pickslots.push(m.name));

    if (!CSynth.current.contacts[0] && !CSynth.current.xyzs[0]) return;
    //    msgfix('pickq', p, p * (CSynth.current.contacts[0].maxid - CSynth.current.contacts[0].minid) + CSynth.current.contacts[0].minid);
    // if there's a callback, we should call it.
    let r = [];
    let bedts = [];  // save text for callback
    const cc = CSynth.current;

    // use guidetail to force nomess
    if (CSynth.guidetail === 0) {
        if (msgfix !== nop) nomess('force');
        return;
    }
    if (msgfix === nop) nomess('release');
    let pnames;
    if (cc.contacts[0]) pnames = cc.contacts[0].particleNames; // ?? promote particleNames to cc level?

    if (CSynth.guidetail >= 2) var pos = springs.getpos();
    for (let i = 0; i < pick.array.length; i++) {
        let p = pick.array[i];
        const partidf = p * (numInstances - 1);
        let partid = Math.floor(partidf);
        // let bp = p * cc.range + cc.minid;
        let bp = CSynth.getBPFromNormalisedIndex(p);
        let pname = (pnames ? pnames[partid] : typeof bp === 'number' ? Number(Math.round(bp)).toLocaleString() : bp)+'bp';
        CSynth.picks[i] = CSynth.picks[CSynth.pickslots[i]] = undefined;
        if (!CSynth.pickslots[i]) continue;   // this pick slot not used
        if (!(0 < p && p < 1)) continue;      // this slots indicates no pick
        let bedh = CSynth.bedhitsForFract(p).map(b => b.key);
        let bedt = 'no bed';
        if (bedh.length === 1) bedt = bedh[0];
        bedts[i] = bedt;  // only keep first one here
        if (bedh.length > 1) bedt = '<br>....' + bedh.join('<br>....')
        const stst = CSynth.picks[i] = CSynth.picks[CSynth.pickslots[i]] = {partid, bedh, bedt, bp, pname}
        if (CSynth.guidetail >= 2) {
            const pp = pos[partid];
            partid += ' (' + format(pp.x) + ',' + format(pp.y) + ',' + format(pp.z) + ')';
            stst.pos = pp;
        }
        r.push(CSynth.pickslots[i] + ': ' + pname + '/' + format(partidf) + '   ' + bedt);
    }
    let m1 = pick.array[4], m2 = pick.array[5];   // preselect matrix
    if (m1 > 998 ) { m1 = pick.array[12]; m2 = pick.array[13]; }  // select matrix
    if (m1 > 998 ) { m1 = pick.array[0]; m2 = pick.array[8]; }  // select and preselect on ribbon
    if (m1 > 998 ) { m1 = pick.array[16]; m2 = pick.array[17]; }  // pair of user slots
    if (m1 > 998 || m2 > 998) { m1 = m2 = 999; }  // no sensible pair

    const dist = m2-m1;
    let xdist = '';
    if (m1 < 998 && CSynth.guidetail >= 2) {
        // const mid1 = Math.round(m1 * (numInstances-1)), mid2 = Math.round(m2 * (numInstances-1));
        const mid1 = Math.floor(m1 * (numInstances)), mid2 = Math.floor(m2 * (numInstances));
        xdist = format(pos[mid1].distanceTo(pos[mid2])) + ' units';
    }
    if (dist) r.push('dist:' + (dist * CSynth.current.range).toLocaleString() + ' bp,  ' + xdist);
    msgfix('>pickq', r.length === 0 ? 'none' : '<br>' + r.join('<br>'));

    if (CSynth.guidetail >= 3) {
        const d = CSynth.stats(pos)
        msgfix('>volume', d.volume, '    radii:', d.radii);
    }
    if (CSynth.guidetail >= 4) CSynth.showPickDist();

    if (CSynth.bc && CSynth.picks[4] && CSynth.picks[5]) {
        const x = CSynth.picks[4].partid, y = CSynth.picks[5].partid;
        if (x !== CSynth.bc.last.x || y !== CSynth.bc.last.y) {
            CSynth.bc.postMessage({command: 'setxyShow', args: [0, x, y]})
            CSynth.bc.last = {x, y};
        }
    }

    if (callback) callback(pick.array, bedts);
}
if (CSynth.bc) CSynth.bc.last = {};


/** show used part of pick in CSynth units */
CSynth.showPickDist = function() {
    const markers = CSynth.markers;

    if (!startvr) {
        CSynth.pickslots = ['ribbon', 0,0,0,
            'matrix1', 'matrix2', 0,0,
            'g-ribbon',0,0,0,
            'g-matrix1', 'g-matrix2',0,0];
        markers.forEach(m => CSynth.pickslots.push(m.name));
    }

    if (!CSynth.current.contacts[0] && !CSynth.current.xyzs[0]) return;
    let r = [];
    let hits = [];
    const cc = CSynth.current;
    const pos = readWebGlFloat(springs.posNewvals);
    let index;
    // collect the selection data
    for (let i = 0; i < pick.array.length; i++) {
        let p = pick.array[i];
        let v = p * cc.range + cc.minid;
        if (!CSynth.pickslots[i]) continue;   // this pick slot not used
        if (!(0 < p && p < 1)) continue;      // this slots indicates no pick
        index = Math.round(p * (numInstances-1));  // nearest index could use interpolation?

        const posi = new THREE.Vector3(pos[0][index], pos[1][index], pos[2][index]);
        hits.push( {id: CSynth.pickslots[i], posi, index, pickslot: i, bp: v});
    }

    // use neightbour if only one item picked
    if (hits.length === 1) {
        if (index >=1) index--; else index++;
        const posi = new THREE.Vector3(pos[0][index], pos[1][index], pos[2][index]);
        hits.push( {id:'neighbour:' + index, posi, index});
    }

    // output the pairs, but not TOO many, but make sure all with target distance displayed
    const topi = hits.length > 3 ? 1 : hits.length;
    const thead = '<table class="simpletable"><tr><th>' + 'bpa,bpb,dist<br>units,dist<br>nm,dampd<br>nm,targd<br>nm,bbdist<br>beads,bbdist<br>k bps'.split(',').join('</th><th>') + '</th></tr>';
    let sdistu = 0, stargd = 0, sdampd = 0;
    for (let i = 0; i < hits.length; i++) {
        for (let j = i+1; j < hits.length; j++) {
            const slotsi = hits[i].pickslot, slotsj = hits[j].pickslot;
            const namei = slotsi < 16 ? Math.round(hits[i].bp) : CSynth.markers[slotsi-16].bp;
            const namej = slotsj === undefined ? hits[j].id : slotsj < 16 ? Math.round(hits[j].bp) : CSynth.markers[slotsj-16].bp;

            const targds = CSynth.targetDistances[namei + ' ' + namej];
            if (i >= topi && !targds) continue;

            const distu = hits[i].posi.distanceTo(hits[j].posi);
            const pairkey = hits[i].id + ' ' + hits[j].id;
            if (!(pairkey in CSynth.pairdist)) CSynth.pairdist[pairkey] = distu;
            const dampd = CSynth.pairdist[pairkey] = CSynth.pairdistdamp * CSynth.pairdist[pairkey] + (1-CSynth.pairdistdamp) * distu;
            let targdf = '';
            if (targds) {
                const targd = +targds[CSynth.current.selectedSpringSource];
                targdf = format(targd);
                sdistu += distu;
                stargd += targd;
                sdampd += dampd;
            }
            r.push('<tr><td>' + [
                Number(namei).toLocaleString(), Number(namej).toLocaleString(),
                format(distu),
                format(G.nmPerUnit * distu),
                format(CSynth.pairdist[pairkey] * G.nmPerUnit),
                targdf,
                (hits[j].index - hits[i].index),
                (hits[j].index - hits[i].index)*cc.res/1000
            ].join('</td><td>') + '</td></tr>');
        }
    }
    msgfix('>dists', r.length === 0 ? 'none' : thead + r.join('') + '</table>');
    if (sdampd) G.nmPerUnit = stargd / sdampd;
}
CSynth.pairdist = {};  // for saving/damping distances
CSynth.pairdistdamp = 0.9;

/** log where there are unexpected distances */
CSynth.logOddBackbone = function () {
    const p = springs.getpos();
    for (let i=1; i<p.length; i++) {
        const d = p[i].distanceTo(p[i-1]);
        if (d < 0.75 || d > 1.5) log(i, d)
    }
}

/** ramp into fractal */
CSynth.rampToFractal = function(t = 2000) {
    S.ramp(G, 'springforce', 0, t);
    S.ramp(G, 'fractforce', 0.001, t);
    G.fractpow = 2;
}
/** ramp into standard springs */
CSynth.rampToContacts = function(t = 2000) {
    S.ramp(G, 'springforce', 0.5, t);
    S.ramp(G, 'fractforce', 0.0, t);
    G.fractpow = 2;
}

/** continuous show pick: todo easier start/stop */
CSynth.alwayshowpick = function () {
    Maestro.on('postframe', () => { showpick(); return; });
}

/** read the current springs or use other data and work out orientation
lowindex  particle to low x, high index particle to high x, and top particle to top,
p is positions, by default read from current springs */
CSynth.orientMatrix = function (p = springs.getpos(), top = DNASprings.bpup, useforward = false) {
    const topi = Math.round(CSynth.getNormalisedIndex(top) * numInstances)
    const a = p[0];
    const b = p[p.length - 1];
    const t = p[topi];
    let xdir = new THREE.Vector3().subVectors(b, a).normalize();
    if (useforward) xdir = CSynth.forwardAxis(p);
    const zdir = new THREE.Vector3().subVectors(a, t).cross(xdir).normalize();
    const ydir = new THREE.Vector3().crossVectors(zdir, xdir);
    const m = new THREE.Matrix4().makeBasis(xdir, ydir, zdir).transpose();
    return m;
}

/** orient a matrix from three points, a left, b right and t top */
CSynth.orientMatrixPoints = function (a, b, t) {
    const xdir = new THREE.Vector3().subVectors(b, a).normalize();
    const zdir = new THREE.Vector3().subVectors(a, t).cross(xdir).normalize();
    const ydir = new THREE.Vector3().crossVectors(zdir, xdir);
    const m = new THREE.Matrix4().makeBasis(xdir, ydir, zdir).transpose();
    return m;
}

/** centre of bed range from points  */
CSynth.bedcentre = function (k, p = springs.getpos(), bed = CSynth.files._activebed) {
    let rr = bed.data[k];
    let s = CSynth.getPartposFromBP(rr.startbp);
    let e = CSynth.getPartposFromBP(rr.endbp);
    let sum = new THREE.Vector3();

    for (let i = s; i <= e; i++) sum.add(p[i]);
    sum.multiplyScalar(1 / (e - s + 1));
    return sum;
}

/** orient from first three bed regions */
CSynth.bedorient = function (p = springs.getpos(), bed = CSynth.files._activebed) {
    let a = CSynth.bedcentre(0);
    let b = CSynth.bedcentre(2);
    let t = CSynth.bedcentre(1);
    let r = CSynth.orientMatrixPoints(a, b, t);
    G._rot4_ele = r.transpose().elements;  // for now, force orientation
}

/** use orientation to set view */
CSynth.orient = function (p, top, useforward) {
    G._rot4_ele = CSynth.orientMatrix(p, top, useforward).transpose().elements;
}

/** use orientation to compute new coords */
CSynth.orientCoords = function (p = springs.getpos(), top=undefined, useforward=undefined) {
    const m = CSynth.orientMatrix(p, top, useforward);
    let r = [];
    for (let i = 0; i < p.length; i++)
        r[i] = p[i].clone().applyMatrix4(m);
    return r;
}

/** save a set of positions in a file */
CSynth.savexyzOVERRIDDEN = function (fid = 'CSynth/data/test.xyz', p = springs.getpos(), head = [p.length, 'atoms']) {
    let s = head.slice();  // don't destory input
    let f6 = (v) => format(v, 6);
    for (let i = 0; i < p.length; i++) {
        s.push([i, f6(p[i].x), f6(p[i].y), f6(p[i].z)].join(' '));
    }
    writetextremote(fid, s.join('\n') + '\n');
    return s;
}

/** get width of input */
CSynth.width = function (plow = 0, phigh = numInstances - 1, p = springs.getpos()) {
    return p[phigh].distanceTo(p[plow]);
}

/** compute a 'best' forward axis by correlating position in strand and position in space */
CSynth.forwardAxis = function (p = springs.getpos()) {
    let sum = new THREE.Vector3();
    let t = 0;
    for (let i = 0; i < p.length; i++) {
        let ii = i - (p.length - 1) / 2;
        t += ii;
        sum.addScaledVector(p[i], ii);
    }
    sum.normalize();

    // for reference
    const a = p[0];
    const b = p[p.length - 1];
    const xdir = new THREE.Vector3().subVectors(b, a).normalize();
    const dot = xdir.dot(sum);
    const d = Math.acos(dot) * 180 / Math.PI

    log('forwardAxis', sum, 't', t, 'xdir', xdir, 'dot', dot, 'ang', d);
    return sum.normalize();
}

/** save the current red white oriented in new files  (only needed occasionally) */
CSynth.orientGenRedWhite = function () {
    const dr = CSynth.parseXYZ(CSynth.current.xyzs[0]).coords;
    const rr = CSynth.orientCoords(dr);
    CSynth.savexyz('CSynth/data/longxyz/orient_red.xyz', rr);

    const dw = CSynth.parseXYZ(CSynth.current.xyzs[1]).coords;
    const rw = CSynth.orientCoords(dw);
    CSynth.savexyz('CSynth/data/longxyz/orient_white.xyz', rw);
}

CSynth.guidetail = 0;

// save xyz file
CSynth.savexyz = function (fid) {
    const xyz = '.xyz';
    fid = GX.getNewFilename(fid, xyz);
    const cc = CSynth.current;
    if (!fid.endsWith(xyz)) fid += xyz;
    GX.write(fid, springs.save(0, cc.minid, cc.res))
}

/** choose a given bed for all bed functions */
CSynth.chooseBed = function (bed) {
    if (!CSynth.colourGUIs) CSynth.colourGUIs = [];
    if (CSynth.parseBioMart.sourceGUI)
        CSynth.parseBioMart.sourceGUI.userData.setValue(bed);  // may not be if only constant, rainbow
    CSynth.colourGUIs.forEach(g => g.userData.setValue(bed));
    GX.setValue('modes/beddatasource', bed);
}

/** add (or replace) top level bed gui, and children if any */
CSynth.refreshBedGUIs = function (modes = V.modesgui) {
    if (!modes) return;
    const bedname = "BED data source:";
    let index;
    if (CSynth.bedgui) {
        GX.removeItem(CSynth.bedgui);
        index = CSynth.bedgui.guiIndex;
    }

    const sources = CSynth.current.beds.map(b=>b.shortname).concat(Object.keys(CSynth.fixedBeds));
    const n = CSynth.bedgui = modes.add({x:sources[0]}, 'x', sources).name(bedname).listen().onChange(CSynth.chooseBed);
    n.index = index;

    CSynth.refreshColourGUIs();
    CSynth.refreshTextSource();
}

VH.handheldGUIScale = 80;
VH.handheldGUIDistance = 10;

/** make a gui, if force is set remake even if already there
 * if force is a function, call it to insert extra nodes at stop of tree
 */
CSynth.makegui = async function(force) {
    loadTime('model 4 makegui start');
    if (Array.isArray(force)) GX.exclude = force;
    //camera.near = 10;
    //camera.far = 10000;
    if (force) VH.killgui();
    const cc = CSynth.current;

    if (!V.gui) {
        CSynth.updateAvailableFiles.last = undefined;   // sidestep file dropdown optimization
        V.gui = dat.GUIVR.createX("CSynth: " + cc.project_name);
        let cam = startvr ? camera : V.nocamcamera;

        if (typeof force === 'function') force(V.gui);

        var saveload = V.saveloadgui = dat.GUIVR.createX("Save/Load");

        // V.gui.add(GX, 'restoregui');
        const bb = [3,
            { func: CSynth.savexyz, tip: "Save current positions as xyz file.", text: 'savexyz' },
            { func: CSynth.savepdb, tip: "Download current positions as PDB file.", text: 'savepdb' },
            { func: GX.savegui, tip: "Save current settings from the gui,\n+orientation.", text: 'savegui' },
            { func: () => STL.output('obj'), tip: "Save current form as obj file.", text: 'save obj' },
            { func: () => STL.output('stl'), tip: "Save current form as stl file.", text: 'save stl' },
            { func: () => downloadImage(cc.project_name, 'png', true), tip: "Download current image\ncurrent resolution", text: 'save image' },
            { func: () => downloadImage(cc.project_name, 'png', false), tip: "Download current image\nwithout gui\ncurrent resolution", text: 'save image\nno gui' },
            { func: () => downloadImageHigh(3840, cc.project_name, 'png', false), tip: "Download current image\nwithout gui\nlarge dimension 3840\ncurrent aspect ratio", text: 'save big image\nno gui' }
        ];
        saveload.addImageButtonPanel.apply(saveload, bb).setRowHeight(0.100);

        CSynth.updateAvailableFiles();  // this will insert file dropdown in V.saveloadgui
        V.gui.addFolder(saveload)

        //not enabling mouse for VR demo
        //if (!startvr)
            dat.GUIVR.enableMouse(cam, renderer);

        //we only want gazeInput if there are no controllers.
        //V.gazeInput = dat.GUIVR.addInputObject( camera );
        //V.rawscene.add( V.gazeInput.cursor ); //  only add the cursor, not the laser
        V.showbigcontrollers = true;
    }
    var gui = V.gui;

    // no dat.GUIVR.remove. so clean old gui .. for testing remake of gui, dangerous use of V.gui.children[0]
    // var cc = V.gui.children[0]; while (cc.children.length > 0) cc.remove(cc.children[0]);
    // find short names for the buttons (? should do this at load time)
    // also it would be best to kill the unused buttons rather than adding ???

    //## changes made for Crick demo, we may want to keep them afterwards
    //## stretch out button now first and dynamics button removed
    function ctype(ftype) {
        CSynth.springSettings.contactFtype = ftype;
        const src = cc.selectedSpringSource < cc.contacts.length ? cc.selectedSpringSource : 0;
        CSynth.applyContacts(src);
    }
    //let buttonsM = [4,
    //    {func: () => ctype('contact'), tip: 'use standard CSynth dynamics model', text: 'CSynth'},
    //    {func: () => ctype('contactM'), tip: 'use Lorentzian dynamics model', text: 'Lorentzian'}
    //];
    let buttonsc = [4];    // assemble array of appropriate buttons, start with width
    let cxx = [];
    if (cc.contacts.length >= 2)
        cxx = trimstrings(cc.contacts[0].shortname, cc.contacts[1].shortname);
    for (let i=0; i < cc.contacts.length; i++) {
        let desc;
        if (cc.contacts[i].shortname === cc.contacts[i].filename)
            desc = (cxx[i] || trimstrings(cc.contacts[0].shortname, cc.contacts[i].shortname)[1]);
        else
            desc = cc.contacts[i].shortname;

        const cci = cc.contacts[i];
        if (cc.showLorentzian) {
            buttonsc.push({
                func: () => {ctype('contact'); CSynth.applyContacts( cc.contacts[i]);},
                tip:
`${cci.description}
Model derived from
interaction frequency values
in the contacts file:
${cci.filename}`,
            text: desc  + '\nCSynth IF'
            });

            buttonsc.push({
                func: () => {ctype('contactLor'); CSynth.applyContacts( cc.contacts[i]);},
                tip:
`${cci.description}
Model derived from
interaction frequency values
in the contacts file:
${cci.filename}`,
            text: desc  + '\nLorentz IF'
            });


        } else {
            buttonsc.push({
                func: () => CSynth.applyContacts( cc.contacts[i]),
                tip:
`${cci.description}
Model derived from
interaction frequency values
in the contacts file
${cci.filename}`,
            text: desc  + '\nIF'
            });
        }
    }  // add contacts
    CSynth.numContactsButtons = buttonsc.length - 1;

    // add some dummy buttons so xyz buttons line up
    const dd = (401 - buttonsc.length)%4;  // 401 as width 4 is first entry
    for (let i=0; i < dd; i++)
        buttonsc.push({});

    // let buttonsx = [4];
    let xxx = [];
    if (cc.xyzs.length >= 2)
        xxx = trimstrings(cc.xyzs[0].shortname, cc.xyzs[1].shortname);
    for (let i=0; i < cc.xyzs.length; i++) {
        let desc;
        const cci = cc.xyzs[i];

        if (cci.shortname === cci.filename)
            desc = (xxx[i] || trimstrings(cc.xyzs[0].shortname, cci.shortname)[1]);
        else
            desc = cci.shortname;
        buttonsc.push({
            func: () => CSynth.applyXyzs(cci),
            tip:
`${cci.description}
Model using distances
computed from the position file:
${cci.filename}`,
            // text: (xxx[i] || trimstrings(o.xyzs[0].shortname, o.xyzs[i].shortname))
            text: desc + '\ndists'
        });

        // removed at Steve's suggestion, 13/03/2018, readded 27/04/18
        buttonsc.push({
            func: () => CSynth.xyzsExact(cci),
            tip:
`${cci.description}
Exact positions as in position file:
${cci.filename}`,
            text: desc.length < 14 ? desc + '\npositions': 'fixed\npositions'
        });
    }

    var modes = V.modesgui = dat.GUIVR.createX("Modes");
    guiFromGene(modes, 'scaleFactor'); // ;

    CSynth.refreshBedGUIs(modes);

    CSynth.addWigGUI(modes);

    const bb = [4,
        { func: CSynth.autoscale, tip: "autoscale to the current conformation\nHome key", text: 'Auto scale' },
        { func: springs.reCentre, tip: "recentre particles (e.g. in case of simulation drift)", text: 'Recentre' },
        { func: loadwide, tip: "stretch out (loadwide)\n", text: 'Stretch' },
        {},
        {
            func: CSynth.randpos, tip:
`set new pseudo-random positions
and allow conformation to reform.
If seed (below) is non-0 it will be used as a seed,
otherwise a random seed will be used.

R key, or K,R keys`, text: 'Random'
        },
        { func: ()=>runkeys('K,H'), tip: "Refold from helix conformation\n\nK,H keys", text: 'Helix' },
        { func: ()=>runkeys('K,T'), tip: "Refold from twisted helix\n\nK,T", text: 'Twist'},
        { func: ()=>runkeys('K,S'), tip: "Refold from space filling curve\n\nK,S", text: 'Space filling'},

        { func: ()=>GX.restoregui('>initial.settings'), tip: "Restore initial settings", text: 'Reset' },
        { func: ()=>GX.restoregui('>previous.settings'), tip: "Restore settings from previous session", text: 'Previous' },
        { func: ()=> springs.recordCycle(), tip: 'Record single cycle of spring history', text: 'Record Cycle'},

        //{ func: loadopen, tip: "open to helix\nand allow conformation to reform\nctrl-H keys", text: 'Helix' },
        //{ func: ()=>CSynth.kick(10), tip: "kick\nIf selection, kick selected\nelse kick all", text: '<Kick' },
        //{ func: ()=>CSynth.kick(50), tip: "big kick\nIf selection, kick selected\nelse kick all", text: '>Kick' },
        //{ func: CSynth.curstats, tip: "show statistics comparing\ncurrent positions with current model\nX key", text: 'Cur stats' },
        //{ func: CSynth.allstats, tip: "show statistics comparing\nall fixed posistions\nwith current model\nY key", text: 'Fixed stats' }
    ];
    modes.addImageButtonPanel.apply(modes, bb).setRowHeight(0.075); // .highlightLastPressed();

    modes.add(CSynth.randpos, 'seed', 0, 99).step(1).setToolTip('Seed for random position\nIf 0 a random seed will be used.');

    if (CSynth.ImageButtonPanel) {
        // V.ImageButtonPanelFtype = modes.addImageButtonPanel.apply(modes, buttonsM).setRowHeight(0.08).highlightLastPressed();
        V.ImageButtonPanelC = modes.addImageButtonPanel.apply(modes, buttonsc).setRowHeight(0.15).highlightLastPressed();
        V.modelButtons = V.ImageButtonPanelC.children[0].children;
        //if (cc.xyzs.length > 0)
        //    V.ImageButtonPanelX = modes.addImageButtonPanel.apply(modes, buttonsx).setRowHeight(0.15).highlightLastPressed();

        modes.open(); onframe(modes.open);
    } else {
        serious('attempt to use old code???');
    }
    // ??? todo consider how nohorn should get going
    if (searchValues.nohorn)
        myRequestAnimationFrame();

    gui.addFolder(modes);
    if (!searchValues.nohorn) {
        gui.addFolder(springs.createGUIVR());

        VH.cartoon = new CSynth.Ribbon();
        gui.addFolder(VH.cartoon.createGUIVR());

        gui.addFolder(CSynth.parseBioMart.createGUIVR());  // annotations

        VH.matrix = new CSynth.Matrix();
        gui.addFolder(VH.matrix.createGUIVR());

        VH.hist = new CSynth.HistoryTrace();
        gui.addFolder(VH.hist.createGUIVR());

        VH.SphereParticles = new CSynth.SphereParticles();
        gui.addFolder(VH.SphereParticles.createGUIVR());

        VH.Metavis = new CSynth.Metavis();
        gui.addFolder(VH.Metavis.createGUIVR());

        VH.LineVis = new CSynth.LineVis();
        gui.addFolder(VH.LineVis.createGUIVR());


        //deferred till data read
        //VH.ImageVis = new CSynth.ImageVis();
        //gui.addFolder(VH.ImageVis.createGUIVR());

        VH.selectionSpheres = new CSynth.SelectionSpheres();
    }

    VH.hornLaser = new CSynth.HornLaser();

    await CSynth.loadExtraPDB();


    let view = dat.GUIVR.createX("View");
    view.add(CSynth, 'publish').setToolTip("Toggles a light theme better suited to print.");
    //TODO: option to set near / far automatically based on view?
    //why is adding / changing this on console at runtime causing endless material recompilation?
    //happens when making new fog similar to old?
    let fog = V.fog;    // reuse fog if possible; otherwise three.js gets upset
    if (!fog) {
        fog = V.fog = V.camscene.fog = new THREE.Fog(0x000, 100, 2500);
        // nocamscene may need a fog because of issues moving materials (for menu) between camscene and nocamscene
        // but the fog should never be allowed to take effect
        V.nocamscene.fog = new THREE.Fog(0x000, Number.MAX_VALUE, Number.MAX_VALUE);
    }
    const fogOpt = {
        get active() { return V.camscene.fog !== null },
        set active(v) { V.camscene.fog = v ? fog : null }
    }

    let camGui = dat.GUIVR.createX("Camera");
    camGui.add(camera, 'near', 0, 3000);
    camGui.add(camera, 'far', 0, 3000);
    view.add(camGui);

    let fogGui = dat.GUIVR.createX("Fog");
    fogGui.add(fogOpt, 'active').showInFolderHeader();
    fogGui.add(fog, 'near', 0, 3000);
    fogGui.add(fog, 'far', 0, 3000);
    view.add(fogGui);


    let r = view.add(inputs, 'yzrot', -1, 1);
    r.name('xrot');
    r.step(0.05);
    r.onChange( s => setInput(W.yzrot, s));
    view.add(V, 'angleOptions', [0, 1, 2, 3]).name('laser angle').listen();

    //TODO: GUIVR bugfixing relating to this...

    view.add(CSynth, 'modesToHand').listen().setToolTip('attach modes to hand when possible');

    gui.addFolder(view);

    var extras = V.extrasgui = dat.GUIVR.createX('Extras');
    extras.add(CSynth, 'guidetail', 0, 6).listen();

    const savebuttons = [5,
        { func: ()=>CSynth.saveRuns({nruns:1000}), tip:'run up to 1000 tests', text: "Run tests"},
        { func: ()=>CSynth.compareRuns.break = true, tip:'stop tests', text: "Stop tests"},
        { func: CSynth.startLMV, tip:'start large matrix viewer in another window', text: "LMV"},
        { func: writeBintri, tip:'save bintri files', text: "save bintri"}
    ];
    extras.addImageButtonPanel.apply(extras, savebuttons).setRowHeight(0.15);

    const gGui = dat.GUIVR.createX("graphics");
    // background gui.  todo, fit in with setBackgroundColour (which fixes gamma, fog etc)
    // and correct update
    gGui.add(window, 'bigcol').name('background'); // .onChange(updateColourGenes);
    const gxx = {
        get aares() {return 1/inputs.renderRatioUi},
        set aares(v) {setInput(W.renderRatioUi, 1/v);}
    }

    gGui.add(gxx, 'aares', 0.5, 4).step(0.1).listen().setToolTip('antiAlias factor');
    gGui.add(HW.resoverride, 'lennum', 1000, 64000).step(1).listen().setToolTip('graphics resolution along ribbon');
    gGui.add(HW.resoverride, 'radnum', 3, 30).step(1).listen().setToolTip('graphics resolution around ribbon');
    extras.add(gGui);

    const next = ()=>G.stepsPerStep=2;
    if (CSynth.ImageButtonPanel) {
        const fff5 = function() { G.stepsPerStep = 20; G.maxActive = 0.02; S.ramp(G, 'maxActive', 1, 5000, {next}) }
        const fff20 = function() { G.stepsPerStep = 20; G.maxActive = 0.02; S.ramp(G, 'maxActive', 1, 20000, {next}) }
        const fff60 = function() { G.stepsPerStep = 20; G.maxActive = 0.02; S.ramp(G, 'maxActive', 1, 60000, {next}) }

        const bbb5 = function() { loadopen(); G.stepsPerStep = 20; G.maxBackboneDist = 0.02; S.ramp(G, 'maxBackboneDist', 1, 5000, {next}) }
        const bbb20 = function() { loadopen(); G.stepsPerStep = 20; G.maxBackboneDist = 0.02; S.ramp(G, 'maxBackboneDist', 1, 20000, {next}) }
        const bbb60 = function() { loadopen(); G.stepsPerStep = 20; G.maxBackboneDist = 0.02; S.ramp(G, 'maxBackboneDist', 1, 60000, {next}) }

        // we add again the basic buttons for fold etc, and concat new ones
        buttonsc = buttonsc.concat([
            { func: loadfree, tip: "unfolded, only backbone springs (loadfree)", text: 'unfold' },
            { func: loadopen, tip: "open/refold (loadopen)", text: 'helix\nrefold' },
            { func: loadwide, tip: "stretch out (loadwide)", text: 'stretch\nout' },
            { func: fff5, tip: "reveal over 5 seconds", text: 'reveal\n5 secs' },
            { func: fff20, tip: "reveal over 20 seconds", text: 'reveal\n20 secs' },
            { func: fff60, tip: "reveal over 60 seconds", text: 'reveal\n60 secs' },
            { func: bbb5, tip: "grow backbone over 5 seconds", text: 'backbone\n5 secs' },
            { func: bbb20, tip: "grow backbone over 20 seconds", text: 'backbone\n20 secs' },
            { func: bbb60, tip: "growbackbone over 60 seconds", text: 'backbone\n60 secs' }
        ]);
        const subGui = dat.GUIVR.createX("scripts");
        V.ImageButtonPanel = subGui.addImageButtonPanel.apply(extras, buttonsc).setRowHeight(0.15).highlightLastPressed();
        extras.add(subGui);

        const obuttons = [5,
            { func: ()=>CSynth.showEigen(true), tip:'orient object to eigenvectors\nM,E keys', text: "eigen"},
            { func: ()=>CSynth.orient(), tip:'orient object to defined RIGHT/UP particles\nM,O keys', text: "orient"},
            { func: ()=>CSynth.orient('right'), tip:'set RIGHT particle from selected particle\nM,R keys', text: "RIGHT"},
            { func: ()=>CSynth.orient('up'), tip:'set UP particle from selected particle\nM,U keys', text: "UP"},
            { func: ()=>CSynth.tilt(), tip:'rotate object s x axiz goes to screen diagonal\nM,A keys', text: "angle"}
        ];
        const ogui = dat.GUIVR.createX("Orient");
        V.ImageButtonPanel = ogui.addImageButtonPanel.apply(extras, obuttons).setRowHeight(0.15);
        extras.add(ogui);


        const xx = { get running() {return !!springs.running}, set running(v) {if (v) springs.start(); else springs.stop();} }
        extras.add(xx, 'running').name('dynamics running').listen();
        extras.add({
            go: ()=>{
                if (CSynth.annotationGroup.createDebugGUI) CSynth.annotationGroup.createDebugGUI()
            }
        }, 'go').name('annotation spring uniforms GUI');

        gui.addFolder(extras);
        loadTime('model 5 makegui end');
        delete slowinit.pendend.springgdemo;
    }

    VH.positionGUI();

    // collection of details to help run on Android, and to document issues as well
    if (CSynthFast) {
        VH.matrix.visible = false;  // slow for now
        VH.hornLaser.threeObj.visible = false;  // doesn't work 12 July
        VH.selectionSpheres.threeObj.visible = false;  // doesn't work 12 July
        CSynth.GCM.visible = false;  // doesn't work 12 July
        VH.setguivisible(false)  // doesn't work 12 July
        CSynth.annotationGroup.visible = false;  // should already be done while creating ???
        // CSynth.selectionAnnotationGroup.visible = false; // not ready yet


        V.pickfun = pickGPU;  // slow or wrong?? 12 July

        V.rawscene.sphereparticles.visible = false;  // true to display spheres
        W.renderMainObject = true;                  // false to stop displaying ribbom
        DNASprings.stretch = false;  // so no need to reupload spring topology each frame

        // usesavedglsl='csy.opt';remakeShaders();  // Stephen only so far, no noticable help
    }

    gui.guiChildren.forEach(c => {
        if (c.isFolder) c.detachable = true;
    })

    if (!searchValues.nohorn && G.matDistFar >= 0) {  // may be -999 during initializations
        const mdfgui = GX.getgui('matrix/colour/matDistFar');
        mdfgui.max(3*G.matDistFar);
        mdfgui.step(G.matDistFar > 33 ? 1 : 0.1);
    }

    // attempt to reduce three overhead
//    otraverse(gui, o => {o.autoUpdate = false; o.matrixAutoUpdate = false; o.frustumCulled = false; })
    VH.updateCsynthGUI();
//    GX.savegui();
    let scene = startvr ? V.camscene : V.nocamscene;
    scene.add(V.gui);

    CSynth.addTooltips();

    Maestro.trigger('guiready');
}

CSynth.detachModesFromHand = ()=>{
    const modes = V.modesgui;
    if (!modes) return;
    if (modes.detachable) return;
    V.gui.visible = true;
    if (modes.parent === V.nocamscene) return;   // should check for != leftcontroller, not sure how to make that reliable
    if (modes.oldParent === V.nocamscene || modes.oldParent === null) {
        V.nocamscene.add(modes);
        modes.position.copy(modes.oldPosition);
        modes.quaternion.copy(modes.oldQuaternion);
        modes.scale.copy(modes.oldScale);
        modes.matrixAutoUpdate = true;
    } else {
        modes.reattach();
        modes.detachable = true;
    }
}
CSynth.attachModesToHand = ()=>{
    const modes = V.modesgui;
    if (!modes) return;
    modes.visible = true;
    // in XR ordering is slightly different and modes orientation can be changed after first attemp to set
    if (modes.parent === V.gpL.threeObject && modes.quaternion.x !== 0) return;
    // if((!modes.detachable && modes.parent !== V.nocamscene)) return;
    if (!V.gpL) return msgfixerror('attachModesToHand', 'attempt to attach when no left gamepad');
    modes.oldParent = modes.parent;
    modes.oldPosition = modes.position.clone();
    modes.oldQuaternion = modes.quaternion.clone();
    modes.oldScale = modes.scale.clone();
    modes.detach();
    modes.detachable = false;
    modes.grabDisabled = true;
    const k = renderVR.scale / 400;  // values below were tuned for renderVR.scale = 400
    const s = VH.handheldGUIScale*k;
    const d = VH.handheldGUIDistance*k;
    modes.position.set(s * -0.5, d, -s * FIRST(modes.spacing, V.gui.spacing) / 4);
    modes.quaternion.set(0,0,0,1);
    modes.scale.set(s,s,s);
    modes.updateMatrix();
    modes.rotateX(-Math.PI/2);
    modes.updateMatrix();
    V.gpL.threeObject.add(modes);
    VH.setguivisible(false);
    V.BypassLeftLaser = true;
    msgfix('attachModesToHand', 'main menu attached to left gamepad');
};

CSynth.removeFromParent = function(v) {
    if (v && v.parent) v.parent.remove(v);
}

CSynth.modesToHand = true;  // attach modes to hand when possible
Maestro.on('preframe', () => {  // monitor each frame to ensure appropriate attachment
    if (!V.gui) return;
    if (renderVR.invr() && !VH.fixguiForVR) {
        if (V.gpL && CSynth.modesToHand ) {
            CSynth.attachModesToHand();
        }
        if (!V.gpR) {  // especially if leap
            CSynth.removeFromParent(V.gui);
            CSynth.removeFromParent(V.modesgui);
        }
    } else {
        CSynth.detachModesFromHand();
        if (V.modesgui && !V.modesgui.parent) V.nocamscene.add(V.modesgui);
        // below mainly applies immediately on leaving VR, or entering tad.headResting
        if (VH.fixguiForVR && V.gui.position.z !== 0)  {
            VH.positionGUI();
            V.gui.add(V.modesgui);  // should have happened but ???
            V.modesgui.open();
        }
    }
});



// functions for pressing and highlighting model buttons
// todo: make part of generic code
CSynth.pressFixed = function(i) { CSynth.press(2*i + CSynth.numContactsButtons+1)}
CSynth.pressDist = function(i) { CSynth.press(2*i + CSynth.numContactsButtons)}
CSynth.pressCsynth = function() { CSynth.press(0)}
CSynth.pressLorDG = function() { CSynth.press(1)}

// press (and highlight) a button, prevent mutual recursion with CSynth.applyContacts etc
CSynth.press = function(ii) {
    if (CSynth.press.in) return;
    CSynth.press.in = true;
    try {
        const butt = V.modelButtons[ii + 1];
        if (butt) butt.interaction.events.emit('onPressed',{})  // butt may have been removed
    } finally {
        CSynth.press.in = false;
    }
}



/** make dropdown for file, and replace in place if needed */
CSynth.updateAvailableFiles = function(parent = V.lastsavegui || V.saveloadgui, newname) {
    V.lastsavegui = parent;
    const cc = CSynth.current;
    if (!cc) return;
    const dir = cc.fullDir;
    if (newname === '>!auto.settings') return;
    // ??? better than above ??? if (cc.availableFiles && cc.availableFiles[newname]) return;
    cc.availableFiles = dir ? readdir(dir) : [];
    const xx = {x:''};
    let files = Object.keys(cc.availableFiles).filter(x => x.endsWith('.settings') || x.endsWith('.xyz'));
    files = files.concat(GX.locallist());
    files = files.filter(x => !x.includes('!'));    // do not display files with ! in name
    const fstr = files.join(',');                   // quick out if no change
    if (fstr === CSynth.updateAvailableFiles.last) return;
    CSynth.updateAvailableFiles.last = fstr;
    //What if files array is empty?
    let place = undefined;
    if (V.filesgui) {
        place = V.filesgui.guiIndex;
        parent.remove(V.filesgui);
    }
    V.filesgui = undefined;
    if (files.length === 0) return;
    const nnn = V.filesgui = parent.add(xx, 'x', files).name("Files:").onChoose(fn => {
        log('>>>> load file', fn);
        xx.x = '';
        if (fn.endsWith('settings') || fn[0] === '#')
            GX.restoregui(fn);
        if (fn.endsWith('.xyz'))
            CSynth.xyzFileToFix(fn);
    });
    if (place !== undefined) V.filesgui.guiIndex = place;

    CSynth.filedropgui = nnn;
}

VH.updateCsynthGUI = function() {
    if (!V.gui) return;
    otraverse(V.gui, o => o.updateMatrix());
    V.gui.updateMatrixWorld(true);
}

CSynth.SeparateGUIPanels = () => {
    const scene = startvr ? V.camscene : V.nocamscene;
    const masterGUI = dat.GUIVR.createX("Master panel");
    const scale = V.gui.scale;
    V.guis = [];
    scene.add(masterGUI);
    V.guis.push(masterGUI);
    //const visibilityButtons = [];
    const children = V.gui.guiChildren.map(x=>x);
    let y = -0.5;
    children.forEach(gui => {
        V.gui.detachChild(gui);
        gui.close();
        masterGUI.add(gui, 'visible').name(gui.folderName);
        gui.scale.set(scale.x, scale.y, scale.z);
        gui.position.y = y;
        y += gui.spacing;
        scene.add(gui);
        V.guis.push(gui);
    });
}

/** turn on all views, useful for debug */
CSynth.viewall = function() {
    // select and ctrl-shift-e to evaluate in console

    VH.setguivisible(true)

    VH.matrix.visible = true;
    VH.hornLaser.threeObj.visible = true;
    VH.selectionSpheres.threeObj.visible = true;
    V.rawscene.sphereparticles.visible = true;
    G.sphereRadius = 5;
    G.selectedSphereRadius = 20;
    renderMainObject = true;
    V.rawscene.historytrace.visible = true;
    CSynth.annotationGroup.visible = true;

    V.rawscene.imagevisgroup.visible = true;
    V.rawscene.imagevis2group.visible = true;
    V.rawscene.imagevis3group.visible = false; // <<< known bad
    V.rawscene.imagevis4group.visible = true;

    W.springgui.style.display = 'none';

    CSynth.imagevis4Uniforms.brightness.value=-1.5;
    // CSynth.imagevis4.newmat(); // refresh the shader
}

/** called each frame while boosting springs,
tracks matrix selection if there, or preselection if not */
CSynth.boostspringsframe = function() {
    const R = numInstances/numInstancesP2;
    const pp = pick.array;
    const sa = pp[12], sb = pp[13], pa = pp[4], pb = pp[5];
    const a = sa < 998 ? sa : pa;
    const b = sb < 998 ? sb : pb;
    G.boostx = a*R; G.boosty = b*R;
    msgfix('boost', G.boostx, G.boosty, G.boostrad, G.boostfac);
}

/* turn spring boosting on/off or toggle */
CSynth.boostsprings = function(flag = true) {
    if (flag === 'toggle')
        flag = !CSynth.boostsprings.mid;
    if (flag && !CSynth.boostsprings.mid) {
        CSynth.boostsprings.mid = Maestro.on('postframe', CSynth.boostspringsframe);
        if (!G.boostfac) G.boostfac = 1000;
        if (!G.boostrad) G.boostrad = 0.03;
        CSynth.maxMatrixSize = 1; // kill matrix height, it interferes with picking
    } else if (!flag && CSynth.boostsprings.mid) {
        Maestro.remove('postframe', CSynth.boostsprings.mid);
        CSynth.boostsprings.mid = undefined;
        G.boostfac = 0;
    }
}

/** turn matrixcontacts on or off */
CSynth.matrixcontacts = function(flag) {
    if (flag) {
        //uniforms.matrix2dtex1.value = CSynth.contactsToTexture(0);
        //uniforms.matrix2dtex2.value = CSynth.contactsToTexture(1);
        //if (!G.matrixcontactmult)
        if (CSynth.current.contacts[0]) {
            CSynth.contactsToTexture(0);  // just to get
            G.matrixcontactmult = 5/CSynth.current.contacts[0].mean;
        } else {
            G.matrixcontactmult = 1; // any non-0 value
        }
        G.matcoltype1 = 3;
        G.matcoltype2 = 2;
        // some conveniences to get it to look right quickly, to decide how to fit with gui
        CSynth.matrixcontacts.old = setAllLots('mat[RGB][12]', 0);
        CSynth.maxMatrixSize = 1;
        onframe(()=>{if (CSynth.matrot) CSynth.matrot.rotation = 1.2});
    } else {
        //uniforms.matrix2dtex1.value = undefined;
        //uniforms.matrix2dtex2.value = undefined;
        copyFrom(currentGenes, CSynth.matrixcontacts.old);
        G.matrixcontactmult = 0;
        CSynth.maxMatrixSize = 1024;
    }
    CSynth.matrixcontacts.status = flag;
}

if (!inworker) CSynth.disableCol = col3(0.2, 0.1, 0.1);
/** disable gene by overriding with value, mark gui */
CSynth.disable = function(key, value = 0) {
    geneOverrides[key] = value;
    const gg = guiFromGene.items[key];
    if (gg) GX.color(gg, CSynth.disableCol);
}
/** stop disable gene by overriding with value, unmark gui */
CSynth.enable = function(key) {
    delete geneOverrides[key];
    const gg = guiFromGene.items[key];
    if (gg) GX.color(gg, 'restore');
}

/** add backbone springs, allowing for groups if any */
CSynth.addBackbone = function() {
    const gr = Object.values(CSynth.current.contacts[0].groups);
    for(let i=1; i<numInstances; i++) {
        springs.addspring(i, i-1, 1,1);
    }
    if (gr)
        for (let g in gr)
            springs.removespring(gr[g].endid, gr[g].endid+1);
    G.springforce = 1;
}

/** kill radii to separate groups */
CSynth.breakGroups = function(gr) {
    if (!gr) gr = CSynth.current.contacts[0].groups;
    if (!gr) return msgfixlog('breakGroups', 'called with no groups available');
    if (!Array.isArray(gr)) gr = Object.values(gr);
    const kr = uniforms.killrads.value;
    const l = kr.length;
    if (gr.length > l)
        msgfixlog('breakGroups', 'cannot break all groups, more then KILLRADS');
    for (let i=1; i < Math.min(l, gr.length); i++) {
        kr[i-1] = gr[i].startid - 0.5;  // should be in particle number
    }
    G.killradwidth = target.killradwidth = 0.5;
}

/** extrude region a..b (ids) over time t ms.
If spring change time is small the overall time will be limited by frame rate.
This version implements single slide extrude: a fixed and gradually extrudes till it reaches b */
CSynth.extrude = async function(a, b, t = 2000, marker = 0) {
    a = Math.round(CSynth.particle4id(a));
    b = Math.round(CSynth.particle4id(b));
    const step = (a > b) ? -1 : 1;
    const dt = t / (b-a) * step;                   // target delta time between progressing springs
    let lastbb;
    for (let bb = a; bb !== b; bb += step) {
        if (lastbb) springs.removespring(a, lastbb);
        lastbb = bb;
        springs.addspring(a, bb);
        CSynth.setMarker(marker, CSynth.bp4particle(a));
        CSynth.setMarker(marker+1, CSynth.bp4particle(bb));
        await sleep(dt);
    }
    // you might choose to remove this, so the final spring between a and b remains after extrusion
    // whether you want to do that depends on how to balance the spring and IF models
    springs.removespring(a, lastbb);
}

/** extrude region a..b (ids) over time t ms.
If spring change time is small the overall time will be limited by frame rate.
This version assumes double point extrusions:
eg starts at midpoint c = (a+b)/2 and moves both along till it reaches a,b
 */
CSynth.extrudeDouble = async function(a, b, t = 2000, marker = 0) {
    a = Math.round(CSynth.particle4id(a));
    b = Math.round(CSynth.particle4id(b));
    if (a > b) [a,b] = [b,a];
    const c = Math.round((a+b)/2);          // centre point
    const dt = t / (c-a);                   // target delta time between progressing springs
    let last;
    for (let aa = c; aa >= a; aa--) {
        const bb = a + b - aa;
        if (last) springs.removespring(last[0], last[1]);
        last = [aa, bb];
        springs.addspring(aa, bb);
        CSynth.setMarker(marker, CSynth.bp4particle(aa));
        CSynth.setMarker(marker+1, CSynth.bp4particle(bb));
        await sleep(dt);
    }
    springs.removespring(last[0], last[1]);
}

// R=numInstances/numInstancesP2
// Maestro.on('preframe', () => {G.boostx = pick.array[4]*R; G.boosty = pick.array[5]*R; })


/**
 * visibility etc see also simpleset, graphbase 942
 * VH.matrix.visible = false/true
 * VH.hornLaser.threeObj.visible = false
 * VH.selectionSpheres.threeObj.visible = false
 * V.rawscene.sphereparticles.visible = false/true
 * renderMainObject = true/false
 * V.rawscene.historytrace.visible = true/false
 * V.pickfun = pickGPU/pick (pickGPU to stop readback)
 *
 * renderObjsInner.direct=true/false; // gives visual glitches?
 *
 * ??? why are selectionvis items (sphere and lines) both failing?
 *
 * with ribbon, low res simpleshade usemask=-1=>50, 0=>42, 1=>96, 2=>146
 *
 * CSynth.parseBioMart.setVisibility(true/flase) ? CSynth.annotationGroup.visible = false
 *
 */

// tests on simplified springs
var cc;
CSynth.springtest = function(a,b,c,d) {
    const tt = FIRST(a, 1e-6);
    // test exact springs
    const c0 = cc.xyzs[0].coords;
    const sp = springs.getpos();
    const n = sp.length;
    for (let i=0; i<n; i++) {
        const dd = distxyz(c0[i], sp[i]);
        if (dd > tt) log(i, dd);
    }

    const dd = readWebGlFloat(cc.xyzs[0].texture)[0];
    for (let i=0; i<n; i++) {
        for (let j=0; j<n; j++) {
            const dt = dd[i*n + j];
            const dc = distxyz(sp[i], sp[j]);
            if ((Math.abs(dt-dc) > tt))
                log(i,j, dt,dc);
        }
    }


    return;
    //////////////////////////////
    const dpow = a;
    G.pushapartlocalforce = 0;
    G.nonBackboneLen = 1;       // irrelevant with pushapartlocalforce = 0???

    G.backboneStrength = 1;         // applies whatever backbone type

    const k = 100**-dpow;


    G.springpow += dpow;
    G.pushapartpow += dpow;
    G.contactforce *= k;
    G.pushapartforce *= k;
    msgfixlog('!zzz', '$springpow$; $contactforce$; $pushapartpow$; $pushapartforce$');

    // G.springpow=0; G.contactforce=0.100; G.pushapartpow=-1; G.pushapartforce=0.08;  <<?? pppow-1.settings
    // apply CSynth.springtest(-1)
    //  G.springpow=-1 ; G.contactforce=10 ; G.pushapartpow=-2 ; G.pushapartforce=8;   // works better than above with backbonetype=2
}


// test for fixed -> distance and whether it jumps
// springs.settleHistory(); CSynth.xyzsExact(0); springs.settleHistory(); CSynth.applyXyzs(0); springs.step(1); springs.settleHistory();
