// hornmaker.vs <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// common code, not really horn specific

/**
note to me: 16 Mar 21.
to remove need for too many horn dependent compiles
make NORMTYPE fixed to 1 (below)
make ribs uniform array (?as well as named????)
make cumcount uniform array

**/

#define hhornnum loposuvw.z
#define hhornid loposuvw.w

//#define MAXPATHS 30
uniform float cumcount[MAXPATHS];
//uniform float ribsa[MAXPATHS];
uniform float lribdeptha[MAXPATHS];
#if (OPMODE == OPPOSITION)
uniform float numScalePositionActive;
#endif
float cutoffset;    // extra cut offset for given horn
float lribdepth;

#if (OPMODE == OPPICK)
    //uniform highp int pickxslot;  //extra to add for pick slot
    varying vec4 pickVary0;      // for passing pick information
    varying vec4 pickVary1;     // for passing pick information
    varying vec4 pickVary2;     // for passing pick information
    varying vec4 pickVary3;     // for passing pick information

	uniform highp int pickxslot;  //extra to add for pick slot
    #if (VERTEX == 1)
    // set a value into a slot to pass from vertex shader to fragment shader
    void slot(int num, float v) {
		num += pickxslot;
        if (num == 0) pickVary0.x = v;
        if (num == 1) pickVary0.y = v;
        if (num == 2) pickVary0.z = v;
        if (num == 3) pickVary0.w = v;
        if (num == 4) pickVary1.x = v;
        if (num == 5) pickVary1.y = v;
        if (num == 6) pickVary1.z = v;
        if (num == 7) pickVary1.w = v;
        if (num == 8) pickVary2.x = v;
        if (num == 9) pickVary2.y = v;
        if (num == 10) pickVary2.z = v;
        if (num == 11) pickVary2.w = v;
        if (num == 12) pickVary3.x = v;
        if (num == 13) pickVary3.y = v;
        if (num == 14) pickVary3.z = v;
        if (num == 15) pickVary3.w = v;
    }
    #endif

#endif
void pickopos(vec4 loposuvw) {
	#if OPMODE == OPPICK && VERTEX == 1


		// pickoutput of raw position, used especially by matrix?
		pickVary0 = vec4(999,999,999,999);
		pickVary1 = vec4(999,999,999,999);
		pickVary2 = vec4(999,999,999,999);
		pickVary3 = vec4(999,999,999,999);
		slot(0, loposuvw.x);
		slot(1, loposuvw.y);
	#endif
}

gene(global_ribmult, 1, 0,10, 0.1,0.1, geom, frozen)    // multiplier for #ribs
gene(global_ribmin, 20, 0,200, 1,1, geom, frozen)       // min #ribs
/** makeribsraw handles ribsa array (or overridden equivalent), makeribsx also handles global_ribmult, global_ribmin */
float makeribsraw(vec4 loposuvwzz);
float makeribsx(vec4 loposuvw) {
    return max(makeribsraw(loposuvw) * global_ribmult, global_ribmin);  // n.b. implicit input xhornid
}

#ifdef NOHORNMAKER
// NOHORNMAKER so bulk of hornmaker.vs skipped, but some things get (probably unnecessarily) referenced, so some dummies for those
// ??? const float global_ribmult = 1.0, global_ribmin = -999.0;
uniform float NORMTYPE;
virtual vec4 tr(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){  // 'real' tr () (not NO TR) passed from tr () to computeNormalsEtc
    return vec4(0);
}
uniform float horncount;
virtual float makeribsraw(vec4 loposuvwzz) {return 10.; } // << if this one is being used we don't want to override it.
#else

// This file is highly interdependent with horn.js.
// Horn.js includes many detailed comments about the use of uniforms such as sub_active, etc etc


// Even thought this is marked .vs, it is used by both vertex and fragment shaders.
// code included here to make sure common between vertex and fragment
// # i nclude quaternion.vs;
#define PI    3.1415926535897932384626433

uniform float vn;
//uniform float lennum; // now in common.vfs
//uniform float radnum;
uniform float skelnum;
uniform float skelends;
uniform float horncount;
// uniform float k;  // only used for 'old' style horns, removed 9Feb 2023
uniform vec2 skelbufferRes, gbufferres;
uniform sampler2D skelbuffer;
uniform float gbuffoffset;
uniform vec4 gcentre; // uni form float gscale;

#ifdef NOTR //  OPMODE == OPOPOS || OPMODE == OPSHAPEPOS
float radius;
uniform float nstar, stardepth, ribdepth, gscale;
#endif


uniform sampler2D tex1, tex2, tex3, tex4; // used for sympaint and ???


// these are working features of springs and not used by spring users (such as this code)
//uniform float WORKHISTLEN;
//uniform float workhisttime;
//uniform sampler2D posWorkhist;
//uniform float XPARTICLES;
// uniform float RIBS;
uniform float HEADS;
uniform float histtime;
uniform float minActive, maxActive;
uniform sampler2D scaleRenderTarget;
uniform sampler2D scaleDampTarget;

// float sheet = 0.;  /// overridden to allow sheets to be created, avoiding all the cylinder, ribbing, etc rules

//>>> header here if any
//$ $ $header$$

/** structure to hold information about nested horns up to depth 8
 * was members a,b: renamed to aq,bq to help minifiers
 */

struct Parpos { vec4 aq; vec4 bq; };
/** dot product on Parpos */
float dotParpos (const vec4 la, const vec4 lb, const Parpos r) { return dot(la, r.aq) + dot(lb, r.bq); }

// test if given bit in mask is set, integer version should be faster, and will allow for more bits
#ifdef ISES300
    #define testmask(mask, bitnum) ( ( (int(mask)>>int(bitnum)) % 2) == 1)
#else
    #define testmask(mask, bit) (fract(float(mask)/pow(2.0, float(bit)+1.)+0.00001) > 0.5)
#endif
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
void usecolhsv(const float h, const float s, const float v) {  // use this as the absolute colour
    if (ucol.r == -999.) {
        vec3 rgb = hsv2 rgb(h, s, v);
        ucol = vec4(rgb,1.);
    }
}
**/

gene(global_radmult, 1, 0,10, 0.1,0.1, geom, frozen)    // multiplier for radius
gene(global_radmin, -999, 0,10,0.1,0.1,geom, frozen)    // minimum radius
gene(global_radadd, 0,  0,10,0.1,0.1, geom, frozen)     // amount to add to radius

gene(histl, 0.0, 0,0.9, 0.1, 0.01, springs, frozen) // proportion of history to use
gene(springl, 0.9, 0,0.9, 0.1, 0.01, springs, frozen) // proportion of spring chain to use
gene(kinxagg, 1, 0,20, 1, 0.1, springs, frozen) // exaggeration for kinect changes

gene(shrinkfactor, 1.5, 1,10, 0.1, 0.01, geom, frozen) // facrtor before radius is normal
gene(shrinkradiusA, 0, 0,2000, 10, 0.1, geom, frozen) // radius from clearposA
gene(shrinkradiusB, 0, 0,2000, 10, 0.1, geom, frozen) // radius from clearposB

// ge ne(numPositionActive, Infinity, 0.02, 1, 0.001, 0.001, geom, frozen) // 1 Aug 2022 just uniform to prevent accidental ranging


gene(bias, 103, -1,1,  0.1, 0.01, geom, frozen) // bias for hermite, 0 is even, positive is towards first segment, negative towards the other, other special values
gene(tension, 0, -1,1,  0.1, 0.01, geom, frozen) // tension for hermite,  1 is high, 0 normal, -1 is low
// ge ne(edgebunch, 1.5, 0.5, 3, 0.1, 0.01, geom, frozen) // force in-between points towards edges (not used for nurbs), 1=normal, >1=bunch to edges

gene(repeattran, 1, 0, 1e73, 1, 1, geom, frozen) // if REPEATTRAN is defined and -ve, this is number of times to repeat

gene(killbplength, 1e20, 0, 100, 1, 1, geom, frozen) // kill segments where adjacet points are > killbplength apart
gene(isolatebp, 0, 0, 1,  1, 1, geom, frozen) // isolate all base pairs to points


//ge ne(wallzpush, 1, 0,3, 0.1,0.01, wall, frozen) // wall z kick out
//ge ne(wallxpushwidth, 250, -1, 501, 1,1, wall, frozen) // wall width of z kickout
//ge ne(use cubicskel, 1, 0, 1,  1,1, tex, frozen)	// non 0 to use cubic sleleton interpolation


//<< code automatically generated from tranrule for uniforms
// $ $ $uniforms$$

//<< code automatically generated from tranrule for varyings
// $ $ $varyings$$

// If we are using vertex computed normals we need to pass mnormal etc as varying
// AND need to pass opos on the OPREGULAR pass for texture coordinate mixing.
// If we are using fragment computed normals we only pass opos.

// for regular or OPOPOS2COL we need to compute texture positions ready for use in final shade
// needed in OPSHAPEPOS to make sure radius end coercion happens before me etc saved
#if (OPMODE == OPREGULAR || OPMODE == OPOPOS2COL || OPMODE == OPSHAPEPOS) && VERTEX == 0
    #define DOTEXPOS
#endif

// allow NOOP for Kinect following when not defined
#ifndef topfollow
#define topfollow
#endif

// Set up varyings appropriate to different passes
#if (OPMODE == OPSHADOWS || OPMODE == OPOPOS2COL)
#elif (OPMODE == OPMAKESKELBUFF)
    //??? varying vec4 xxopos;         // original position passed
    varying vec4 objpos;        // object position
#elif (OPMODE == OPREGULAR || OPMODE == OPOPOS)
    //??? varying vec4 o pos;         // original position passed
    varying float vxrscale;      // to allow -ve radius to give sharp point, only used for SHARPPOINT
#elif (OPMODE == OPPICK)
#elif (OPMODE == OPPOSITION)
    varying float scaleVary;    // pass scale information
#elif (OPMODE == OPMAKEGBUFFX && VERTEX == 1)
    varying vec4 objpos;        // object position
#endif

/**** this breaks the optimizer ***
//const float pi = radians(180.);
//const float pi2 = pi*2.;
//const float timek = 0.2;
//const float torad = pi / 180.;
*******/
const float pi = 3.14159; // radians(180.);
const float pi2 = 6.28318; //pi*2.;
const float timek = 0.2;
const float torad = 0.017453277777777776; // pi / 180.;
                    // ??? 0.017453292519943295
float bodynum;			// number of grid points allocated to main horn (not rounded ends)

#ifdef USESKELBUFFER
vec2 skbuffpointtexture(const vec3 p, const float lenn) {
    //float xx = floor(p.x * lenn + 2.5);  // should be exact integer 0..lenn. but make sure.  Will be -2 .. lenn+2 for skeleton, lenn=skelnum
    //xx = floor(p.x * (lenn+5.));  // should be exact integer 0..lenn. but make sure.  Will be -2 .. lenn+2 for skeleton, lenn=skelnum

    float xx = floor(p.x * lenn + skelends + 0.5);  // should be exact integer 0..lenn. but make sure.  Will be -2 .. lenn+2 for skeleton, lenn=skelnum
	float yy = p.z;		// already an integer ?
	return vec2(xx+0.5, yy+0.5) / skelbufferRes;
}

/** work out point in skel buffer to place point on screen */
vec2 skbuffpointscreen(const vec3 p, const float lenn) {
    vec2 tp =  skbuffpointtexture(p, lenn);
    vec2 sp = tp * 2. -1.;  // screen position
    return sp;
}
#endif


// for debug colouring
#ifdef DEBUG
vec4 ggout = vec4(9999.,9999.,9999.,9999.);
#endif

const vec4 white = vec4(1.,1.,1.,1.);
const vec4 yellow = vec4(1.,1.,0.,1.);
const vec4 red = vec4(1.,0.,0.,1.);
const vec4 green = vec4(0.,1.,0.,1.);
const vec4 blue = vec4(0.,0.,1.,1.);

// Work out position for n'th (integer) of totn (may be fractional)
// nsub grow out from the last rib, so eg with nsub=2.5
// nsub will be spaced at a distance of 0.4 starting at 0,
// and with the last rib coerced to 1

// so nsub->r for 2.5 nsub gives 0->0.0, 1->0.4, 2->0.8, 3->1.0
// special case for nsub 0..1
float ppp(const float n, const float nsub) {
    float r = (nsub < 1.) ? (n == 0. ? 1. : 1.-nsub) : min(n/nsub, 1.);
    return r;
}

// Explained oddities: Stephen, 25 Jan 2014, explained 26 Jan.
// ***1: Debug via 'global' variable ggout implicitly passed from splitk() to main()
// does pick up where debug pixels are set, but does not,
// but does not pick up correct colour for the global.
// Passing via layers of inout gout parameters debugs as expected.
// >>> More experiments shows this is a bug in the Chrome compiler
// and applies at the point ggout is assigned.
//
// ***2: The addition v += 0.001 seems to fix all situations.
// However, there are quite a few if (walltype <s where even though
// (floor(vv) != floor(vv+0.001)) the system still gets the right shading,
// and only relatively few where the error causes incorrect shading.
// For example, with just 2x2 objects (k=[1,1], kk=[2,2]) [web8 w3 odd]
// v=0 never gives issues
// v=1, v=3 gives issues but rendering is still correct
// v=2 gives issues that cause rendering problems
// >>> Analysis of the situation shows this is to be expected.
// It is only where the first mod gives the wrong answer that really matters;
// eg when v should equal m*kk.x (some integer m) but is actually a little below.
// For other values of v, r.x may be below the correct value,
// but only trivially so (by the same amount that v was below the correct value).

// ka and kb together keep track of horns of horns up to depth 8.
// ka for the first 4 levels (ka.x, ka.y, etc), kb for the next 4.
// many (?most) models don't use more than 4 levels in which case kb will never be initialized
// That give an issue with minimizer not declaring it.

// split an integer v (possibly held in z of modelMat rix), k is range of numbers (parpos)
// k may be fractional to allow for part subhorns
Parpos splitk(float vv) {
    vec4 ka, kb;  // set from uniforms parnumsa/b for shorter names; , => ; to help minify
    ka = kb = vec4(9999999);  // make sure they appear set for eg minimizer
    #ifdef SINGLEMULTI
	    $$$singlePassCode$$
    #endif
	////return Parpos(vec4(1,2,3,4), vec4(0,0,0,0)); // debug

	float v = vv;
    // it seems ??? that the fill interpolation can take a triangle with integer v value at each vertex
    // and the fill will include some values fractionally below v
    // which will corrupt the calculations below without a small increment to v (or other trick)
    //
    #ifdef DEBUG
        if (fract(v) > 0.1) ggout = red;  // comes out yellow in chrome, see ***1 above
    #endif
    v = floor(v+0.5);   // eliminates risk of integer calculation errors on floats
    vec4 kk = ceil(ka) + 1.;  // kk gives actual number of subhorns
    vec4 ra, rb;
    ra.x = ppp(mod(v, kk.x), ka.x);
    v = floor(v / kk.x);
    ra.y =  ppp(mod(v, kk.y), ka.y);
    v = floor(v / kk.y);
    ra.z =  ppp(mod(v, kk.z), ka.z);
    v = floor(v / kk.z);
    ra.w =  ppp(mod(v, kk.w), ka.w);
    v = floor(v / kk.w);

    kk = ceil(kb) + 1.;  // kk gives actual number of subhorns
    rb.x = ppp(mod(v, kk.x), kb.x);
    v = floor(v / kk.x);
    rb.y =  ppp(mod(v, kk.y), kb.y);
    v = floor(v / kk.y);
    rb.z =  ppp(mod(v, kk.z), kb.z);
    v = floor(v / kk.z);
    rb.w =  ppp(mod(v, kk.w), kb.w);
    v = floor(v / kk.w);

    return Parpos(ra, rb);
}

// get the axis of a vector based on an input value 0.25, 0.5, 0.75
float axof(const vec4 v, const float ax) { return (ax == 0.25 ? v.x : ax == 0.5 ? v.y : ax == 0.75 ? v.z : 0.); }

#define savepos(id) { id = vec3(x,y,z); x = y = z = 0.; }
#define addpos(id) { x += (id).x; y += (id).y; z += (id).z;  }
#define setpos(id) { x = (id).x; y = (id).y; z = (id).z;  }
#define setpos4(id) { x = (id).x; y = (id).y; z = (id).z; w = (id).w;  }

#ifndef off
#define off 0.
#endif
#ifndef goff
#define goff 0.
#endif
// get the position of a particle at a given time, using the spring posHist texture.  particle p in range 0..1
vec4 ppost(const float p, const float t) { return textureget(posHist, vec2(histtime - t, (p)+off)); }

// find particle p at time t, extract the axis according to ax, and rerange low..high (assumes particle pos -1..1)
float mvalt(const float p, const float t, const float ax, const float low, const float high) {   // use texture to get a range
    return (ax <= 0. ? 0. : ((axof(ppost(p,t),ax) + 1.) * 0.5 * (high-low) + low));
}

// get the position of a particle now, using the spring posNewvals texture.  particle p in range 0..1
vec4 ppos(const float p) { return textureget(posNewvals, vec2(0.5, (p)+off)); }

// find particle p now, extract the axis according to ax, and rerange low..high (assumes particle pos -1..1)
//float mval(float p, float ax, float low, float high) {   // use texture to get a range
//   return (ax <= 0. ? 0. : ((axof(ppos(p),ax) + 1.) * 0.5 * (high-low) + low));
//}

// use particle SMAP1 or SMAP2 according to floor(pax), extract the axis according to fract(pax), and rerange
float mvalX2(const float pax, const float range, const vec4 SMAP1p, const vec4 SMAP2p) {   // use texture to get a range
    return (pax <= 0. ? 0. : (axof( mix(SMAP1p, SMAP2p, floor(pax)), fract(pax)) * range));
}

// use particle SMAP1, extract the axis according to fract(pax), and rerange
float mvalX1(const float pax, const float range, const vec4 SMAP1p) {   // use texture to get a range
    return (pax <= 0. ? 0. : (axof( SMAP1p, pax) * range));
}

gene(cubicmixuse, 1, 0,1, 0.1, 0.01, gtex, frozen)  // 0 for linear scaling, 1 for cubic spline scaling (cleaner ends?)
#define cubicmixpure(x, y, p) (mix(x,y, (3.-2.*p)*p*p))
#define cubicmix(x,y,p) (mix(mix(x,y,p), cubicmixpure(x,y,p), cubicmixuse))

#define vxyz vec3(x,y,z)
/**
// rotation about arbitrary axis
// http://inside.mines.edu/~gmurray/ArbitraryAxisRotation/
# define rotrr(u,v,w,th) {\
float len2 = u*u+v*v+w*w;\
float len = sqrt(len);\
float dot = u*x+v*y+w*z;\
float dotnc = dot * (1.-c);\
float c = cos(th), s = sin(cs);\
vec3 r = vec3(\
    u*dotnc + len2*x*c + len*(-w*y+v*z)*s,\
    v*dotnc + len2*y*c + len*(-u*z+w*x)*s,\
    w*dotnc + len2*z*c + len*(-v*x+u*y)*s\
) / len2;\
x=r.x; y=r.y; z=r.z;\
}
**/
vec3 rotaxf(const vec3 p, const vec3 aax, const float th) {
    vec3 ax = normalize(aax);
    float ddot = dot(ax, p);
    vec3 xx = cross(ax,p);
    float c = cos(th), s = sin(th);
    vec3 r = ax*ddot*(1.-cos(th)) + p*c + xx*s;
    return r;
}

#define swap(a,b) { float t = a; a = b; b = t; }
#define swapn(a,b) { float t = a; a = b; b = -t; }
#define rotax(u,v,w,th) {vec3 pp = rotaxf(vxyz, vec3(u,v,w), th); x=pp.x; y=pp.y; z=pp.z; }
#define stack(v) st(y, v)
#define stackx(v) st(x, v)
#define stacky(v) st(y, v)
#define stackz(v) st(z, v)
#define stackxyz(xxx,yyy,zzz) {st(x, xxx) st(y,yyy) st(z,zzz)}

#define wig(low, high, timefreq, rpfreq, cumrpfreq ) ((low+high)*0.5 + (high-low) * sin(3.14159 * (time * timefreq + rp * rpfreq)))

#define pulse1(t, pulsewidth) (fract(t) > pulsewidth ? 0. : (1. - abs(fract(t) - pulsewidth*0.5) / (pulsewidth*0.5) ))
#define pulse(low, high, timefreq, rpfreq, cumrpfreq, pulsewidth ) (low + (high-low) * pulse1((time * timefreq + rp * rpfreq), pulsewidth))

#define userp myrp


                // ge ne(n + 'pulserate', 1, 0, 1, 0.001, 0.001, 'rate for pulse efect', 'dyn', 0);
                // ge ne(n + 'pulseperhorn', 1, 0, 3, 0.1, 0.1, 'number of pulses per horn', 'dyn', 0);
                // ge ne(n + 'pulsepow', 5, 0, 21, 0.1, 0.01, 'power to make pulse strong', 'dyn', 0);
                // ge ne(n + 'pulsescale', 0.1, 0, 1, 0.001, 0.001, 'scale for pulse efect', 'dyn', 0);
                // ge ne(n + 'pulsemodrate', 0.7, 0, 5, 0.001, 0.001, 'FM mod ratio for pulse', 'dyn', 0);
                // ge ne(n + 'pulsemodscale', 0.2, 0, 1, 0.001, 0.001, 'FM mod scale for pulse', 'dyn', 0);

float pulsex(float rate, float perhorn, float powp, float scale, float modrate, float modscale, float maxp, float pulseendfade,
    float crp, float r, float xscale, float rp, float time) {
    if (scale == 0.) return r;  // n.b. this stops maxp being active
    float modv = modscale / max(modrate, 0.000001)  * sin(time * rate * modrate);           // fm modulation contribution to wave

    float wave = 0.5 + 0.5 * sin(6.283185307179586 * (time * rate  - crp * perhorn  + modv )); // wave scale: range 1 .. 2

    // smooth off scale at ends to prevent unsightly bulge
    if (pulseendfade > 0.) {
        float ff = fract(rp);
        ff = min(ff, 1.-ff);    // f ranges from 0 at each end to 0.5
        scale *= smoothstep(0., pulseendfade, ff);
    }

    float vv = scale * pow(wave, powp );        // pow makes wave sharper
    return min(maxp, r * (1. + vv));                       // new radius after wave shaping
}


// stack along yy axis
#define st(yy, v) yy += v;
#define warp(v, amp, offset) wp(x, y, v, amp, offset)

/** base clelia function */
vec3 cleliaf(float t, float k, float j, float gamma, float beta) {
    float twoPi = pi2;
    float ang1 = (j*t + beta)*twoPi;
    float ang2 = (k*t + gamma)*twoPi;
    vec3 p;
    p.x = sin(ang1) * cos(ang2);
    p.y = sin(ang1) * sin(ang2);
    p.z = cos(ang1);
    return p;
}


/** perform a planar cut, rotated by vang and hang, iffset by offv, graded by offrange, profiled by sharp */
float cutf(float vang, float hang, float offv, float offrange, float sharp, float x, float y, float z) {
    float s=sin(vang*torad); float c=cos(vang*torad);
    float xa = x*c + z*s; float za = -x*s + z*c; float ya = y;
    s=sin(hang*torad); c=cos(hang*torad);
    float d = (offv + cutoffset) - za*c - ya*s;
    return smoothstep(0., 1., (d/offrange))*(1.+sharp)-sharp;
}
// #define cu t(vang, hang, off, offrange, sharp, leaveid) if (xhornid != round(leaveid)) r *= cu tf(vang, hang, off, offrange, sharp, x, y, z);

/** perform a planar cut, rotated by vang and hang, offset by offv, graded by offrange, profiled by sharp
with additional offset cutoffset which is set per horn */
float cutxf(float vang, float hang, float offv, float offrange, float sharp, float x, float y, float z, float cutoffset) {
    if (cutoffset >= 999998.) return 1.0;
    return cutf(vang, hang, offv, offrange, sharp, x, y, z);
}


/** cumulative clelia function with scale to fit into horn structure */
void cleliac(float t, inout float x, inout float y, inout float z, float A, float k, float j, float gamma, float beta) {
    vec3 p = cleliaf(t, k, j, gamma, beta) * A;
    x += p.x; y += p.y; z += p.z;
}

void clelia(inout float x, out float y, out float z, float k, float j, float gamma, float beta) {
    vec3 p = cleliaf(x, k, j, gamma, beta);
    x = p.x; y = p.y; z = p.z;
}

void clelia2(inout float x, out float y, out float z, float k, float j, float gamma, float beta,
    float k2, float j2, float gamma2, float beta2) {
    vec3 p = cleliaf(x, k, j, gamma, beta);
    p += cleliaf(x, k2, j2, gamma2, beta2);
    x = p.x; y = p.y; z = p.z;
}

// for compatability with older users of tw(...)
#define tw(xx, zz, v, offset) {twr(xx, zz, v, offset);}

/** twist code: given two axes, an amount v to twist, and an offset of the twist
Note that the axial values are modified by the method.
*/
void twr(inout float xx, inout float zz, const float v, const float offset) {
    float c = cos((v) * torad);
    float s = sin((v) * torad);
    float tx = xx + (offset);
    xx = c * tx - s * zz - (offset);
    zz = c * zz + s * tx;
}
void twr(inout float xx, inout float zz, const float v) {
    twr(xx, zz, v, 0.);
}

/** twist with phase (for wiggling) */
void twr(inout float xx, inout float zz, const float v, const float offset, const float phase) {
    float c = cos((v+phase) * torad);   // cos/sin for position v
    float s = sin((v+phase) * torad);
    float cb = cos((phase) * torad);    // cos/sin for base v=0
    float sb = sin((phase) * torad);
    float tx = xx + (cb * offset);      // offset for point 0
    float tz = zz + (sb * offset);
    float tx1 = c * tx - s * tz;        // transform for point v
    float tz1 = c * tz + s * tx;

    float tx0 = cb * tx - sb * tz;      // transform for point 0
    float tz0 = cb * tz + sb * tx;
    xx = tx1 - tx0 - xx;                     // return so that point 0 goes to where it started
    zz = tz1 - tz0 - zz;
}

/** twist about arbitary axis */
void twax(inout float xx, inout float yy, inout float zz, const vec3 ax, const float v) {
    mat3 m3 = axrot(ax, v);
    vec3 xyz = vec3(xx,yy,zz) * m3;
    xx = xyz.x;
    yy = xyz.y;
    zz = xyz.z;
}

/** similar to twist, but just a 1d wiggle, and with phase permitted */
void wiggle(inout float zz, const float freq, const float amp, const float phase) {
    float s = sin((freq+phase) * torad);
    float sb = sin((phase) * torad);
    zz += amp * (s-sb);
}
void wiggle(inout float zz, const float freq, const float amp) {
    float s = sin((freq) * torad);
    zz += amp * s;
}

// similar to tw, but allowing for spiral pointing in correct direction
// bias is for two purposes.
//   1 - set to xxx_active it allows the subhorns of a horn to be appropriately oriented
//       but without affecting the orientation (and squashing) of any subhorns
//   2 - other values will have experimental interest and may have artistic interest
//
// with bias == 0 this becomes equivalent to a more expensive implementaiton of tw
// Does not appear to be in use, sjpt 9 Jan 2015
#define sp(xx, zz, v, offset, bias) { \
    float q = (v) * torad; \
    c = cos(q); \
    s = sin(q); \
    float bbias = rp >= 11. ? 0. : bias; \
    vec2 dd = normalize(vec2(s + bbias * q * c, c - bbias * q * s)); \
    tx = xx + (offset); \
    xx = dd.y * tx - s * zz - (offset); \
    zz = c * zz + dd.x * tx; \
}

#define wp(xx, yy, v, amp, offset) { s = sin((v*yy) * torad); xx += xx * amp * s + offset; }

/* define a web form.  Unfortunately needs lots of parameters as ## syntax does not work.
Parameters are
myrp, ribs, rref:  values from the horn on which the web is defined
s2ribs, s2rref, s2stack:  values for 1st subhorn (radials) of  1st subhorn (spokes) of horn
v, amp, offset: values as for warp
prop: proportion of sweep to generate
*/
#define web(myrp, ribs, rref, s2ribs, s2rref, s2stack, v, amp, offset, prop) { \
    stack(myrp*rref*s2stack*s2ribs/s2rref ); \
    warp(v, amp, offset); \
    radiate((ribs+1.)*s2stack*s2ribs/(s2rref*prop)); \
    swapn(y,z); \
}

// https://mollyrocket.com/forums/viewtopic.php?p=6154
#define qrot(qx,qy,qz,qw) { vec3 tx = 2. * cross(vec3(qx,qy,qz), vec3(x,y,z)); vec3 rv = vec3(x,y,z) + q.w * t + cross(vec3(qx,qy,qz),t); x = rv.x; y = rv.y; z = rv.z; }

#define scale(v) { tx = v; x *= tx; y *= tx; z *= tx; xscale *= tx; }
#define scale4(v) { tx = v; x *= tx; y *= tx; z *= tx; w *= tx; xscale *= tx; }

#define radiate(l)  { float rr=x; c=cos(pi2*y/(l)); s=sin(pi2*y/(l)); x=rr*c; y=rr*s; }

// use v = -1 to reflect in x
#define reflx(v) { x *= v; reflnorm *= v; }

//?? ## does not work
//#define growpart(v, me, parent) { me ## _rp *= min(1., v*(1.-(parent ## _rp*parent ## _rref/parent ## _ribs))); }
//#define growpart(v, merp, prp, prr, pri) { merp *= min(1., (1.-(prp*prr/pri))/v); }
// let the end part grow of subhorns diminish at end of base horn
// this gives growth effect of subhorns as #subhorns of base horn increases
// merp gives pr value on sub horn; rpr, rpp and pri give the rp, rref and ribs values for main horn
// would like just to give horn names, but me##_rp syntax does not work
#define growpart(v, merp, prp, prr, pri) { merp *= smoothstep(1., 1.-v, prp*prr/pri); }

#define growpartr(v, merp, prp, prr, pri) { r *= smoothstep(1., 1.-v, prp*prr/pri); }

// EvolArt book, page 151
// ribs : ribs
// rribsref: reference number of ribs (not used by spiral version)
// s : proportion of surface, 1 for full surface
// p : regularity control, 1 for regular
// m : relative position: 0..1
// #define PI    3.1415926535897932384626433

// capture the current transform position and use this for texturing
// first one in wins
// possible todo: separate base for texture and bump mapping
// s gives a nominal stack value for texture stack
#ifdef DOTEXPOS
    #define pintexture(s) { if (texpos.x == 9999.) {texpos = vec3(x,y+s,z); texxscale = xscale; } }
    #define settexpos(tp) texpos = tp;
#else
    #define pintexture(s) {}
    #define settexpos(tp) {}
#endif

// spirial version, p150
vec3 branchspiral(const vec3 iin, const float ribs, const float rribsref, const float s, const float p, const float m ) {
	float surfprop = 0.5 * (1.-cos(s*PI));
	float ncon = ribs/surfprop;
	float ddd = (PI * ncon)/p;  // was sqrt(PI * ncon), but this is more regular .. to check
	float yy = 1. - 2. * m * surfprop;   // normally -1 ... 1
	float phi = acos(yy);
	// xrot(phi)
	float s1 = sin(phi); float c1 = yy;
	float x1 = iin.x; float y1 = iin.y * c1 + iin.z * s1; float z1 = iin.z * c1 - iin.y * s1;
	// yrot qq
	float qq = ddd*asin(yy);
	float s2 = sin(qq); float c2 = cos(qq);
	return vec3(x1 * c2 + z1 * s2, y1, z1 * c2 - x1 * s2);
}
/***
Values for different ribs.
Ribs grow from the end,
so this shows rib positions and corresponding values for ribs = 2.5
A rib always keeps it's identity onces spawned,
the first rib gets id 0,
and the longitude of the rib (xrot) is fixed for life based on its id.
It gradually moves it latitude away from ribnum 0.

   0   .....  ?      << rmm, always ranges 0..ribs/rribsref
   0   ...... 1      << m, always ranges 0..1
   0   1   2 2.5     << ribnum
   |   |   |  |      << where the ribs are
   0   1   2  3      << ribid


***/
// animation version, p151
// iin is point to distort
// ribs number of ribs
// rribsref ref number of ribs (not used directly, but must be compensated for to get m from rm
// s proportional coverage
// p controls longitude angle between successive ribs
//    p=1 gives 137.5 degree separation (suggested by ?, see refs in book)
// grownum controls the number of ribs that are still growing
// rm distance along horn in 'reference' units, typically 0 .. ribs/ribsref; which will be 0..1
// m distance 'along' horn as proportion, range 0..1
// so m*ribs is rib number
vec3 branchanim(const vec3 iiin, const float ribs, const float rribsref, const float s, const float p, const float grownum, const float rm ) {
//if (m < 0.001) iin *= 2.;
    /// if (m <= 0.0001 && ribs != floor(ribs)) iin *= fract(ribs);  // so partial ribs grow
	float m = 1. - rm * (rribsref / ribs);    // 1. - means it grows from correct last 'outside' point even when surfprop !== 1
    //float ribnum = m*ribs;
    //dead if (m >= 0.999999 && ribs != floor(ribs)) iin *= fract(ribs);  // so partial ribs grow
	vec3 iin = iiin;
	float ribnum = rm*rribsref;
	float ribid = ribnum;

	// if the ribs are straight the test below not needed, the 'fractional' rib is the last one has phi=0 and psi (qq) will be irrelevant
    // however, if not straight, psi IS relevant
    if (m == 0.0 && fract(ribnum) != 0.0) {                 // do we need some tolerance here?
    	ribid = floor(ribnum) + 1.0; //  - 0.000);          // so fractional rib id (m==1) keeps     same id/angle
        // iin = iiin * fract(ribnum);                      // almost always 1, but allows last rib to grow; like grownum=1, without scurve
    }

    // float tp = 0.75;							            // allows the end 25% to grow smoothly,
    // if (rm > tp) iin = iiin * scurve((1. - rm) / (1. - tp));

    // float nn = 10.;
    // if (ribnum > rribsref-grownum) iin = iiin * scurve(1. - (ribnum - rribsref + grownum)/grownum); // grow last grownum ribs
    if (ribnum > rribsref-grownum) iin = iiin * scurve((rribsref - ribnum)/grownum); // grow last grownum ribs, a 'new' rib will start at size 0

	//iin = iiin * sqrt(1.-rm);					// ribs grow but never get to full strength


	float surfprop = 0.5 * (1.-cos(s*PI));
//	float ncon = ribs/surfprop;             // number of ribs for complete coverage
//	float m = fract(ribid * 0.97901);		// every ribnum will have a fixed (very-psuedo-random) direction however many ribs
	float yy = clamp(1. - 2. * m * surfprop, -1., 1.);  // clamp stops first/last ribs sometimes missing
	float phi = acos(yy);
	// xrot(phi)
	float s1 = sin(phi); float c1 = yy;
	float x1 = iin.x; float y1 = iin.y * c1 + iin.z * s1; float z1 = iin.z * c1 - iin.y * s1;
	// yrot qq
	float qq = 137.5 * PI / 180. * p * ribid;
	float s2 = sin(qq); float c2 = cos(qq);
    // if (isNaN(s2+c2)) {s2=3., c2=3.;}
	return vec3(x1 * c2 + z1 * s2, y1, z1 * c2 - x1 * s2);
}

// for use by new style
#define branchspiralX(s, p, rpb, rribs, rrref) { vec3 o = branchspiral( vec3(x,y,z), rribs, rrref, s, p, rpb); x=o.x; y=o.y; z=o.z; }
#define branchanimX(s, p, grownum, rpb, rribs, rrref) { vec3 o = branchanim( vec3(x,y,z), rribs, rrref, s, p, grownum, rpb); x=o.x; y=o.y; z=o.z; }


vec4 rawp;              // raw input pos

#define dbend 1.
#define dtwist 2.
#define dcurl 3.
#define dstack 4.
#define dscale 5.

uniform vec4 dynUniforms[60];
void dynopx(float t, inout float x, inout float y, inout float z, float opn) {
    // vec4 op = dynUniforms[int(opn)];
    vec4 op; int opnn = int(opn);
    // for (int i=0; i < 60; i++) { if (i == opnn) { op = dynUniforms[i]; break; }}
    if (opn == 1.) op = dynUniforms[1];
    if (opn == 2.) op = dynUniforms[2];
    if (opn == 3.) op = dynUniforms[3];
    if (opn == 4.) op = dynUniforms[4];
    if (opn == 5.) op = dynUniforms[5];
    if (opn == 6.) op = dynUniforms[6];

    if (op.x == dbend) twr(x, y, op.y*t, op.z);
    if (op.x == dtwist) twr(x, z, op.y*t, op.z);
    if (op.x == dcurl) twr(y, z, op.y*t, op.z);
    if (op.x == dstack) stack(op.y*t);
}
#define dynop(opn) dynopx(myrp, x, y, z, opn);


/** transform a point p (typically the origin) by transform rules
along the 'current' horn by offset ppx along that horn

Also set the texpos value for fragment shader texturing, if in appropriate shader
 */


/** tr (p) turn an array of 2d squares into wrapped 3d (or more d) objects
p.x and p.y give each raw unwrapped square, in range 0..1
and p.z gives an index into which square within the array.

Also set the texpos value for fragment shader texturing, if in appropriate shader
 */

// tr (p) returns the transformed point for p
// >>>>>>>> NONONO ????? as side effect it also sets NOxmu, NOxmv, xmnormal, texpos, texxscale
// and also sets as output xmnormal and texpos
// and ribnum (number of rib for ribbing effect along single horn)
gene(superwall, 1./2.5, 0, 1, 0.01,0.01, wallgeom, frozen) // inverse power used for superegg wall(for superegg walltype = 2)
#define xpow(x, p) (pow(abs(x), p))

gene(walltype, 0, 0, 6, 1,1, wallgeom, frozen)  // wall type, <br>0: as defined, <br>1: sphere, <br>2: superegg, <br>3: sphere modulated
gene(wallka, 1, -2,2,0.1,0.1, wallgeom, frozen)  // multiplier for first wall frequency (for walltype = 3)
gene(walla, 1, -2,2,0.1,0.1, wallgeom, frozen)  // first wall frequency(for walltype = 3)
gene(wallkb, 1, -2,2,0.1,0.1, wallgeom, frozen)  // multiplier for second wall frequency(for walltype = 3)
gene(wallb, 1, -2,2,0.1,0.1, wallgeom, frozen)  // first second frequency(for walltype = 3)
gene(wallk, -2, -4,2,0.1,0.1, wallgeom, frozen) // constant offset for wall(for walltype = 3)

#define XNORMALDEFINED
varying vec3 xnormal;        // pass javascript defined normal for walls etc
                                // passed from js->vertex shader as normal, and vs to fs as xnormal
vec4 trwall(in vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum) {
    // ribnum used as wallid for sharp wall edges with neighbour based normals
    ribnum = 0.;

//     // vec3 seed =  vec3(1.7,1.3,1.9);             // hope not parallel to normal
    xmnormal = -xnormal;
// choose normal assuming cube, xy fudge probably needed because of interpolation issues even with all three triangle corner values same???
// only ribnum actually used now, normals usually computed later (but used by OPOPOS2COL), but this ribnum calculation not helpful with flexible walls
    if      (abs(loposuvw.z - walllow.z) < 0.001) { xmnormal = vec3(0,0,1); ribnum = 3.; }
    else if (abs(loposuvw.x - walllow.x) < 0.001) { xmnormal = vec3(1,0,0); ribnum = 1.; }
    else if (abs(loposuvw.y - walllow.y) < 0.001) { xmnormal = vec3(0,1,0); ribnum = 2.; }
    else if (abs(loposuvw.z - wallhigh.z) < 0.001) { xmnormal = vec3(0,0,-1); ribnum = 6.; }
    else if (abs(loposuvw.x - wallhigh.x) < 0.001) { xmnormal = vec3(-1,0,0); ribnum = 4.; }
    else if (abs(loposuvw.y - wallhigh.y) < 0.001) { xmnormal = vec3(0,-1,0); ribnum = 5.; }
    else { xmnormal = vec3(0,0,1); ribnum = 7.; }

//        else if (abs(abs(loposuvw.x) - walllow.x) < 0.001) { xmnormal = vec3(-sign(loposuvw.x), 0.,0.001); ribnum = 1.;} // xmu = vec3(0.,1.,0.); xmv = vec3(0.,0.,1.); }
//        else if (abs(abs(loposuvw.y) - walllow.y) < 0.001) { xmnormal = vec3(0., -sign(loposuvw.y), 0.); ribnum = 2.; } // xmu = vec3(0.,0.,1.); xmv = vec3(1.,0.,0.); }
//        else                                              { xmnormal = vec3(0,0,1); ribnum = 7.; }
    // if (abs(loposuvw.x) < wallxpushwidth && loposuvw.z < -499.9) { loposuvw.z *= wallzpush; }     // experiment in wall shape
    xhornid = WALLID;

    if (walltype < 0.5) {  // as defined in mesh geometry

    } else if (walltype < 1.5) { // experiment with spherical wall
        loposuvw.xyz = _boxsize * normalize(loposuvw.xyz);

    } else if (walltype < 2.5) { // experiment with superegg wall
        //float qq = loposuvw.x/_boxsize * 0.5 + 0.5;  // w.i.p. continous change superegg
        //float superwallq = superwall * qq;
        float superwallq = superwall;
        vec3 xyzkp = xpow(vec3(loposuvw.xyz / _boxsize), vec3(1. / (superwallq + 0.0001)));
        float xyzsump = xyzkp.x + xyzkp.y + xyzkp.z;
        float r = xpow(1. / xyzsump, superwallq);
//r *= (1. + superwall * 0.7);  // w.i.p. to correct with keepinroom before uncommenting
        loposuvw.xyz *= r;

    } else if (walltype < 3.5) { // experiment with sine wave modulated wall
        vec3 r;
        if (loposuvw.z > -_boxsize + 0.01) return(vec4(sqrt(wallk-99999.),1,1,1)); // ignore most walls
        vec2 aa = loposuvw.xy / _boxsize * 3.14159;
        r.x = wallka * sin(walla * aa.x);// + wallkb * sin(wallb * aa.x);
        r.z = wallk + wallka * cos(walla * aa.x) + wallkb * cos(wallb * aa.x);
        r.y = aa.y/4.;
        loposuvw.xyz = r * _boxsize;

    } // else treat as standard

    texpos = loposuvw.xyz;
    return loposuvw;
} // trwall

// xscale;           // for scale to work out overall radius passed up from tr_i() to tr ()
// xrscale:         // modified and scaled radius, xscale*r
// texxscale;        // snapshot of xscale to work out radius at texture point passed up from tr_i() to tr ()


/**
p: base position, usually origin
ppx: position along horn, usually range 0..1
parpos: structure to give position in all horns
xrscale: scaled radius
texxscale: overridden texture scale, usually xscale
texpos: overriden texture position, usually texpos.x == 9999, which means ignore and use final position
*/
vec4 tr_i(const vec4 p, const float ppx, const Parpos parpos, out float xrscale, out float texxscale, out vec3 texpos) {
    float xscale = 1.;
    texxscale = 1.;
    // settexpos(vec4(9999., 0., 0., 1.));  // init texpos as 'unset'
    texpos = (vec3(9999., 0., 0.));  // init texpos as 'unset', even if not used

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    float s,c,x,y,z,w,tx;

    float r = radius;

    //-- transform to give ribby feel, and to close in ends
    // todo, try to integrate this better with other transforms?
	float rp = ppx;    // relative position along 'active' horn

	float crp = 0.;	// cumulative rp

	// ribby and ends now come later


    //<< setupcode, automatically generated from tranrule for start of main horn transformation code
	$$$setupcode$$  // AFTER rp may have changed

    // radius will be applied after transform,
    x = p.x;
    #ifdef SHEET
        y = p.y;
    #else
        y = 0.; // *p.y; // reduce y so we are following a spline up the centre
    #endif
    z = p.z;
    // w = p.w;
	// we don't use w as an input, only as an output (for 4d),
	// or conventional w=1 for projective 3d
	// it will go through traditional 3d unscalthed and be 1. at the end as we want
	w = 1.;

    //<< pretranrule, automatically generated from user defined tranrule
	$$$pretranrule$$

#ifdef REPEATTRAN
    #if REPEATTRAN < 0
        #define rrepeattran repeattran  // use the gene
        #define BREAK if (n >= rrepeattran) break;
        #define TOP 1e7
    #else
        #define rrepeattran float(REPEATTRAN)
        #define BREAK
        #define TOP rrepeattran
    #endif
    {
        float rrrr = 1. / rrepeattran;
        //float rr = sqrt(rrrr);  // scale by sqrt each time, look a litte more real but costs more
        vec4 ss = vec4(0);
        for(float n = 0.; n < TOP; n++) {
            BREAK  // if controlled by repeattran gene
            y = n * 0.00000001 / rrepeattran;  // prevent optimization
            x = p.x + y;
            z = p.z; w = 1.; r = radius;
            xscale = 1.; texxscale = 1.; crp = 0.;
            //<< tranrule, automatically generated from user defined tranrule into glsl
            $$$trancode$$;
            ss += vec4(x,y,z,w);
        }
        ss *= rrrr;
        x = ss.x; y = ss.y; z = ss.z; w = ss.w;
    }
#else
    //<< tranrule, automatically generated from user defined tranrule into glsl
    $$$trancode$$;
#endif

    //<< posttranrule, automatically generated from user defined tranrule
	$$$posttranrule$$

	// autoscale and position, sets object centred and to standard size
	#if (OPMODE == OPPOSITION || (defined(NOSCALE) && defined(NOCENTRE)))
		// no autoscale when finding scale, if if not required
	#else
		#ifdef using4d
			// note GPUSCALE not implemented for 4d yet
			x -= gcentre.x;
			y -= gcentre.y;
			z -= gcentre.z;
			w -= gcentre.w;
			scale4(gscale)
		#else
			#ifdef GPUSCALE
				// note, scaleDampTarget set by scalesmooth.vs/scalesmooth.fs
				vec4 xx = textureget(scaleDampTarget, vec2(0.5 ,0.5));
                #ifndef NOCENTRE  // sorry about all these double negatives
                    x -= xx.x;
                    y -= xx.y;
                    z -= xx.z;
                #endif
                #ifndef NOSCALE
				    scale(xx.w);
                #endif
			#else
                #ifndef NOCENTRE
                    x-=gcentre.x;
                    y-=gcentre.y;
                    z-=gcentre.z;
                #endif
                #ifndef NOSCALE
    				scale(gscale)
                #endif
			#endif
		#endif
	#endif


    // output into slots to save on varying
    // when we kept first_rp etc as varying,
    // we blew the max number of varyings allowed
    #if (OPMODE == OPPICK && VERTEX == 1)
        // pickoutput, automatically generated from tranrule <<< generated wrong for recursive horns (and cage???)
        $$$pickoutput$$
    #endif

    pintexture(0.);  // set texture if nobody else did it earlier
    // #if OPMODE != OPMAKESKELBUFF
    //     r =  max(r, 0.);
    // #endif
    xrscale = xscale * r;
    // Math.max(r * radmult + radadd, radmin);
    /*??? if (r > 0.) **/ xrscale = max(xrscale * global_radmult + global_radadd, global_radmin);

    return vec4(x, y, z, w);
}  // tr_i


// todo. #######~~~~~~~
// texture << capture scale at texture point
// allow below to be genes for experiment, but fix for efficiency in normal use
#define sampdist 0.01
//ge ne(sampdist, 0.01, 0,1, 0.0001, 0.001, system, frozen) // sampling distance to establish horn radii

//minimal todo ,ake this a #define
//#define NORMTYPE 1.
//#if 1==0  // generate the gene and uniform even though they are ignored, some code looks at them
gene(NORMTYPE, 1,  -9990,-9996, 1, 1, system, frozen) // type used for normals WARNING NOT ACTIVE GENE
//#endif
gene(ENDTYPE, 1.5, -3,3, 0.01,0.01, system, frozen)      // type used for ends


const vec4 base = vec4(0.,0.,0.,1.);

// nb, skeleton saved after autoscale (but before rot4), in particular holds scaled radius, which makes
virtual float skelrad(float r, float rp, float oposz) {  // radius for a given position after skeleton, r ia
	return r;
}

// // catrom, cubic and hermite not used by default
// // catrom selected by bias = 100
// // Also equivalent but different (default) code selected for bias > 99 but not 100/101/102
vec4 catrom(float t, vec4 y0, vec4 y1, vec4 y2, vec4 y3) {
    vec4 r = 0.5 *(  	(2. * y1) +
            (-y0 + y2) * t +
            (2.*y0 - 5.*y1 + 4.*y2 - y3) * t*t +
            (-y0 + 3.*y1- 3.*y2 + y3) * t*t*t);
    return r;
}

// cubicX is b-spline (?).  It is smoother but does NOT pass through the points.
// cubicX selected by bias = 102
vec4 cubicX(const in float v,  vec4 y0,vec4 y1,vec4 y2,vec4 y3){
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    float w = 6.0 - x - y - z;
    vec4 ww = vec4(x, y, z, w) * (1.0/6.0);
    vec4 r = ww.x * y0 + ww.y * y1 + ww.z * y2 + ww.w * y3;
    return r;
    // return vec4(x, y, z, w) * (1.0/6.0);
}

// // cubic selected by bias = 101
vec4 cubic(float mu, vec4 y0,vec4 y1,vec4 y2,vec4 y3) {
    float mu2 = mu*mu;
    vec4 a0 = y3 - y2 - y0 + y1;
    vec4 a1 = y0 - y1 - a0;
    vec4 a2 = y2 - y0;
    vec4 a3 = y1;
    return a0*mu*mu2+a1*mu2+a2*mu+a3;
}

// // bias = tension = 0 makes this equivalent to catrom.  use for bias < 99
vec4 hermite(float mu, vec4 y0, vec4 y1, vec4 y2, vec4 y3) {
// from FoldSynth hermiteInterpolate
		vec4 m0,m1;
        float mu2,mu3;
		float a0,a1,a2,a3;

		mu2 = mu * mu;
		mu3 = mu2 * mu;
		m0  = (y1-y0)*(1.+bias)*(1.-tension)/2.;
		m0 += (y2-y1)*(1.-bias)*(1.-tension)/2.;
		m1  = (y2-y1)*(1.+bias)*(1.-tension)/2.;
		m1 += (y3-y2)*(1.-bias)*(1.-tension)/2.;
		a0 =  2.*mu3 - 3.*mu2 + 1.;
		a1 =    mu3 - 2.*mu2 + mu;
		a2 =    mu3 -   mu2;
		a3 = -2.*mu3 + 3.*mu2;

		vec4 aa = (a0*y1+a1*m0+a2*m1+a3*y2);
        return aa;
}

vec3 skelstep;  // step along skeleton
vec4 aa;	// reference lookup
vec3 skela3;

/** choose a cubuic, output into skelstep, aa, skela3 */
void cubicChoice(float x, vec4 p0, vec4 p1, vec4 p2, vec4 p3) {
    // for some reason, hermite works for csynth but not for any/many Organic models
    // specific catrom and cubic did not help much either, 12/10/18 sjpt, but left in just in case
    // so disabled for now
    if (bias == 17.) {
        aa = p1;
        skela3 = aa.xyz;
        skelstep = vec3(0);
    } else if (bias == 18.) {
        aa = p1 * (1.-x) + p2*x;
        skela3 = aa.xyz;
        skelstep = vec3(0);
    } else if (bias >= 103.) {       // was the only case for some time, still default at 1 May 2023
        vec4 a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
        vec4 b =  1.0 * p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
        vec4 c = -0.5 * p0            + 0.5 * p2           ;
        vec4 d =                   p1                      ;
        aa = a*x*x*x + b*x*x + c*x + d;
        skelstep = (3.0*a*x*x + 2.0*b*x + c).xyz;
    } else if (bias == 100.) {
        aa = catrom(x, p0,p1,p2,p3);
        vec4 aa1 = catrom(x + 0.001, p0,p1,p2,p3);  // todo, symbolic catrom differentiation
        skela3 = aa.xyz;
        skelstep = (aa1 - aa).xyz;
    } else if (bias == 101.) {
        aa = cubic(x, p0,p1,p2,p3);
        vec4 aa1 = cubic(x + 0.001, p0,p1,p2,p3);  // todo, symbolic cubic differentiation
        skela3 = aa.xyz;
        skelstep = (aa1 - aa).xyz;
    } else if (bias == 102.) {
        aa = cubicX(x, p0,p1,p2,p3);
        vec4 aa1 = cubicX(x + 0.001, p0,p1,p2,p3);  // todo, symbolic cubic differentiation
        skela3 = aa.xyz;
        skelstep = (aa1 - aa).xyz;
    } else if (bias < 99.) {
        aa = hermite(x, p0,p1,p2,p3);
        vec4 aa1 = hermite(x + 0.001, p0,p1,p2,p3);  // todo, symbolic hermite differentiation
        skela3 = aa.xyz;
        skelstep = (aa1 - aa).xyz;
    } else {  // bias >= 99 uses older more efficient less flexible version (?? === catrom)
        vec4 a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
        vec4 b =  1.0 * p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
        vec4 c = -0.5 * p0            + 0.5 * p2           ;
        vec4 d =                   p1                      ;
        aa = a*x*x*x + b*x*x + c*x + d;
        skelstep = (3.0*a*x*x + 2.0*b*x + c).xyz;
    }
}


/** compute transform and direction,  output skeleton information plus data (xmu etc) to flesh it out to full horn */
void trdir(const float ppx, const Parpos parpos, out vec4 skela, out vec3 xmu, out float xrscale, out float texxscale, out vec3 texpos, out float lll) {

// pick needs various rp values computed, and position gets confused by saving already positioned/scaled value
// Do not bother to fix other than disabling skelbuffer_ use,
// as in the long term PICK can operate from the opos buffer rtopos
// and POSITION can operate from the skeleton buffer (held in skelbuffer_)

#if (defined(USESKELBUFFER) && OPMODE != OPMAKESKELBUFF && (OPMODE != OPPICK || defined(SKELPICK)) ) //  && OPMODE != OPPOSITION)
    #define usingskelbuffer
// todox regularize wide texture buffer with no wrapping for given horn, part done by using wide, short buffer
// todox fix with scale (possibly totally new simplified scale that uses skelbuffer_ raw)
    float oposz = parpos.aq.x;  // used to pass oposuvw.z (eg which hornid?) by abuse of parpos
	float dd = 1./skelnum;
	/**/  // close up the end comment for old linear
	// we must have cubic where skeleton is low res tracking springs
	// and doesn't cost too much (?) even for regular if (walltype <
	#if 1 == 2 && (OPMODE == OPOPOS || OPMODE == OPSHADOWS)
		#define usecubicskel 0.
	#else
		#define usecubicskel 1.
	#endif
	if (usecubicskel == 0.) {  // linear
		dd *= 1.1;
		// vec2 bp = skbuffpointtexture(vec3(ppx, 0., oposz), skelnum);
        vec2 bp = vec2(ppx * skelnum + 0.5, oposz + 0.5) / skelbufferRes;
		aa = textureget(skelbuffer, bp); // if (aa.w >= 16.) aa.w -= 16.;
		skela3 = aa.xyz;

		// make ppx2 be in next linear segment so that the direction xmu and normal move smoothly
		// but with correction at very last segment
		//float ppx2 = ppx+dd < 1. ? ppx+dd : 1.;  // can be removed when extended beyond ends
        dd = 0.001;
		float ppx2 = ppx+dd;
		// bp = skbuffpointtexture(vec3(ppx2, 0., oposz), skelnum);
        bp = vec2(ppx2 * skelnum + 0.5, oposz + 0.5) / skelbufferRes;
		vec3 skela31 = textureget(skelbuffer, bp).xyz;

		// compute direction
		skelstep = (skela31-skela3);
	} else /**/ { // cubic
		float lowint = floor(ppx * skelnum);  	// integer position of low end of segment 0..skelnum-1
        float x = ppx * skelnum - lowint;       // x is fractional position within segment 0..1
        float skxx = skelnum + 2. * skelends;

// disable edgebunch code for now, slightly dodgy
// edgebunch distributes more points nearer the control (skeleton) points, as the curvature is likely to be higher there.
// the line below seems to fix it, but playing safe for a little longer
//        x = max(x, 0.); // needed in organic but not CSynth,
//        float v1 = pow(x, edgebunch);       // edgebunch to get more points near particles, eg at sharp corners
//        float v2 = pow(1.-x, edgebunch);
//        x = v1 / (v1+v2);
// alternative version, different range for edgebunch
//float xx = 3.*x*x - 2.*x*x*x;
//x = mix(x, xx, edgebunch);

        // four points to use for lookup for skeleton positions
		// note: coserce to range not needed for significant skelends values;  but very important for tadpoles with skelends = 0
        // clampToEdgeWrapping fixes the lowint < 0 end, but not lowint+2 > skxx as the buffer is sometimes wider than needed
        // In any case, we now have a better fix for the p0 and p3 values where they may have been wrong
        float s0 = lowint - 1.; ///skelnum;
        float s1 = lowint     ; ///skelnum;
        float s2 = lowint + 1.; ///skelnum;
        float s3 = lowint + 2.; ///skelnum;
        // float s3 = min(skxx, lowint + 2.);///skelnum;


        // Looked up skeleton points that define segment
		// May be able to optimize below using deltas in framebuffer space
        float skelnum1 = 1.;
		vec4 p0 = textureget(skelbuffer, skbuffpointtexture(vec3(s0, 0., oposz), skelnum1));
		vec4 p1 = textureget(skelbuffer, skbuffpointtexture(vec3(s1, 0., oposz), skelnum1));
		vec4 p2 = textureget(skelbuffer, skbuffpointtexture(vec3(s2, 0., oposz), skelnum1));
		vec4 p3 = textureget(skelbuffer, skbuffpointtexture(vec3(s3, 0., oposz), skelnum1));

        // now correct the ends to get the last segments right, especially for small skelends, tadpoles
        if (lowint - 1. < 0.) p0 = 3.*(p1-p2) + p3;
        if (lowint + 2. > skxx) p3 = 3.*(p2-p1) + p0;


#ifdef SPLITTING
        /*
        SPLITTING is used to break one horn into several.
        It is used by tadpoles to allow 'mini' tadpoles.
        It is usually signalled by negative radius on 'boundary' elements.

        Splitting interferes with other uses of negative radius (for sharper cutoff at 0 radius)

        Ways of splitting: 11 May 2021
        SPLITTING and -ve radius to indicate separation; tadpoles
        SHARPPOINT and -ve radius: kill -ve radius parts so can make sharp point as radius crosses 0
        killrad: uniforms.killrads.value, G.killradwidth, separation at points specified in killrads
                implemented mainly as override in CSynth1.oao, also in HistoryTrace.js
        isolatebp: make each base pair (?) separate. totally unused code as far as I can see    ?? obsolete
        killbplength: force out regions where particles (base pairs?) more than given distance apart    ?? obsolete
        */
        float E = ENDTYPE;

        // this should be handled more generally below
		//if (E > -5. && lowint == 0.) p0.xyz = (E + 2.) * p1.xyz - (2.*E + 1.) * p2.xyz + E * p3.xyz;
        //if (E > -5. && lowint == skelnum - 1.) p3.xyz = (E + 2.) * p2.xyz - (2.*E + 1.) * p1.xyz + E * p0.xyz;

        /* handle separated parts ... w.i.p.
        pm    p0    p1    p2    p3    p4
        |-----|---+-|-+#+-|-+---|-----|     # is central divide. + is point to use as end of sphere end.
                    A     B                 A 1 and B 2                 handle isolated singles
               CCCCC DDDDD EEEEE            C 01, D 12, E 23            handle pairs
         FFFFFFFFFFF                        F m01, G 012, H 123, I 234  handle triples
                GGGGGGGGGG
                     HHHHHHHHHHH
                           IIIIIIIIIII
               JJJJJJJJJJJJJJJJJ            J0123 handles 'standard' block of 4
        */

        // (AAAA) sometimes conflicts with shrinkRadius:
        // Resolved with special case for -ve in shrinkRadius code
        // ? If we change this test we must change shrinkRadius code accordingly
        #define testb(set, test) bool set = test.w < 0.; if (set) test.w = -test.w;
		// #define testb(set, test) bool set = false;

        // float RZ = 1.;         // key to add to radius as flag
        testb(b01, p0); b01 = b01 || (lowint - 1. < -0.5);
        testb(b12, p1);
        testb(b23, p2); b23 = b23 || (lowint + 1. > skelnum + 0.5);
        testb(b34, p3); b34 = b34 || (lowint + 2. > skelnum + 0.5);
        bool split = false;
        vec4 px, dir;

        if (b12) {                              // split at # as shown above
            split = true;
            bool right = x > 0.5;               // which half am I in
            if (right) {                        // in right of split section
                px = p2;
                //o x = x - 0.5;
                x = x-1.;                       // x -0.5 .. 0
                if (b23) {                      // right split is isolated
                   dir = vec4(-1);               // Case B 2
                } else {                        // right split not isolated
                    if (b34) {
                        dir = p3-p2;            // Case E 23
                    } else {
                        dir = p3-p2;            // to refine Case I 234
                    }
                }
            } else {                            // in left of split section
                px = p1;
                // x = x + 0.5;
                if (b01) {                      // left split is isolated
                    dir = vec4(-1);             // Case A 1
                } else {                        // left split not islated
            		vec4 pm = textureget(skelbuffer, skbuffpointtexture(vec3(lowint-2., 0., oposz), skelnum1));
                    testb(bm0, pm); bm0 = bm0 ||  (lowint - 2. < -0.5);
                    if (bm0) {
                        dir = p1-p0;            //Case C 01
                    } else {
                        dir = p1-p0;            // to refine Case F m01
                    }
                }
            }
        } else {                                //not split at #
            if (b01) {
                if (b23) {
                    p0 = p1; p3 = p2;           // Case D 12
                } else {
                    p0 = (E + 2.) * p1 - (2.*E + 1.) * p2 + E * p3;     // Case H 123
                }
            } else {
                if (b23) {
                    p3 = (E + 2.) * p2 - (2.*E + 1.) * p1 + E * p0;     //Case G 012
                } else {
                                                // Case J 0123
                }
            }
        }

        bool docubic = true;
        // input to this section is px, dir, x in -0.5 .. 0.5
        // output can be p0, p1, p2, p3 to feed to cubic
        // or do not call cubic code after this, prepare aa, skelstep etc directly
        if (split) {
            // this will be forced by r=0 below, but ??? cleaner to force it this way ???
            float nan = sqrt(-1.+0.01*x); //  nan = 0.;
            if (abs(x) > 0.498) { p1 = p2 = aa = skela = vec4(nan); return; } // get rid of joins to next item

            float k2 = bodynum/skelnum*0.5;     // points per half; eg k=6, k2 = 3
            float ext = k2/(k2-1.);             // expand so 'used' part of points just gets to where radius is 0
            x = 2. * x * ext;                   // expand so 'useful' x in range -1 .. 1,  +-|-+ in diagram above, + maps to -1 or 1
            float rr = px.w;                    // capture radius
            float r = rr * sqrt(max(0.0,  1. - x*x));     // shape to circle
            skelstep = normalize(dir.xyz);
            vec3 rrr = px.w * skelstep;

            aa.xyz = px.xyz + x * rrr;
            aa.w = r;
            docubic = false;
            // don't usually visit the following lines
            //p0 = p1 = p2 = p3 = px;    // force use of same point (till offset below)
            //p0.xyz -= 1.*rrr; p2.xyz += 1.*rrr; p3.xyz += 2.* rrr;  // <<< to do, make offset more varied
            //p0.w = p1.w = p2.w = p3.w = r;
        }    // end separated parts

        float zz = 1e-4;        // offset for isolated points

        // handle isolated point case
        // w.i.p. to be integrated with code above
        // For this to work best we want an even number of grid points per skeleton point
        //
        // example with 6 grid points per skeleton point
        // p1                p2
        // |--+--+--.--+--+--|--+--+--.--+--+--|
        // 1  ;  0  !  0  ;  1  ;  0  !             radius:    ; = 0.7     ! = invalid (or 0) separation point
        //    left    right                         which side of the segment divide are we rendering
        //          A                 B             which segment are we rendering
        //             0--;--1--;--0                rendering of single particle, showing radius
        //
        // Each particle is rendered in two parts;
        //   the left of the particle as the right side of left segment A
        //   the right of the particle as the left side of right segment B
        // The halfway point ! may be considered as left or right (depending on rounding details);
        // it doesn't matter which, it will be invalidated and thus force separation either way.
        //
#else
    #define docubic true
#endif

        #ifdef OLDSPLIT
            // older (obsolete? mechanisms to split segments
            if (isolatebp != 0.) {
                bool left = x < 0.5;                    // if in left hand rendering section, right side of particle
                // float x = fract(x + 0.5);            // n.b. this gave some odd rounding issues
                x = left ? x + 0.5 : x - 0.5;           // make decision just once as to if we are in left or right
                p0 = p1 = p2 = p3 = left ? p1 : p2;     // force use of same point (till offset below)

                // this will be forced by r=0 below, but ??? cleaner to force it this way ???
                if (x < 0.002 || x > 0.998) { p1 = p2 = skela = vec4(sqrt(-1.+0.01*x)); return; } // get rid of joins to next item

                float k2 = bodynum/skelnum*0.5;     // points per half; eg k=6, k2 = 3
                float ext = k2/(k2-1.);             // expand so 'used' part of points just gets to where radius is 0
                x = x * ext - (ext-1.)*0.5;
                float rr = p1.w;                                            // capture radius
                float r = rr * sqrt(max(0.0, 1. - 4.*(x-0.5)*(x-0.5)));     // shape to circle
                float rrr = rr / sqrt(3.);

                p0.xyz -= 2.*rrr; p1.xyz -= rrr; p2.xyz += rrr; p3.xyz += 2.* rrr;  // <<< to do, make offset more varied
                p0.w = p1.w = p2.w = p3.w = r;
            }    // end separated parts

            float bplength = length(vec3(p1-p2));
            if (bplength > killbplength) p1 =  vec4(sqrt(killbplength - bplength));  // force NaN
        #endif // OLDSPLIT

        if (docubic)
        {
            cubicChoice(x, p0, p1, p2, p3);
            // vec4 a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
            // vec4 b =  1.0 * p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
            // vec4 c = -0.5 * p0            + 0.5 * p2           ;
            // vec4 d =                   p1                      ;
            // aa = a*x*x*x + b*x*x + c*x + d;
            // skelstep = (3.0*a*x*x + 2.0*b*x + c).xyz;
	    }
        skela3 = aa.xyz;
    }  // usecubicskel

	// skeleton aa.w already has scale applied, but we want skelrad to work in 'real' radius scale
	// this means for the default we will just divide by ggscale then multiply by it, but hopefully the compiler will sort that
	// in the longer term we might save the skelton pre-autoscale
	// Too late for OPPOSITION to set ggscale 1?? The scaling has already been done by the skeleton
	// which is why we still need not to use skeleton for scaling (until we do a reverse transform?)

    // ??? 24 March 2021 ... skelrad is degenerate for normal case, just returning fist argument,
    // but is overwritten by csynth (for wig etc) so we can't use the simpler xrscale = aa.w
    // n.b. the external optimizer does NOT optimise xrscale = (aa.w / ggscale) * ggscale;
    #if defined(NOSCALE) // || OPMODE == OPPOSITION
        #define ggscale 1.
    #elif defined(GPUSCALE)
        #define ggscale (textureget(scaleDampTarget, vec2(0.5 ,0.5)).w)
    #else
        #define ggscale gscale
    #endif

	xrscale = skelrad(aa.w / ggscale, ppx, oposz) * ggscale;

	// xrscale = max(xrscale, 0.);
	lll = length(skelstep);
	xmu = lll == 0. ? vec3(0.,1.,0.) : skelstep/lll;          // direction, will use as mu
	texxscale = 1.; // 1./(lll-lll);  // todo x consider role of texxscale

	//texpos = vec4(9999., 0.,0., 1.);
	texpos = skela3;
	skela = vec4(skela3, 1.); //todo add some "virtual" modification>?

#else
	// NOT using skelbuff
    // second sample to establish forward direction ~~~~~~~~~~~~~~~
    // second sample first so texxscale etc are set from main sample
    vec4 skela1 = tr_i(base, ppx + sampdist, parpos, OUT xrscale, OUT texxscale, OUT texpos);

    // sample position along spine at given position and slightly along
    // also sample texpos at each of those as well
    skela = tr_i(base, ppx, parpos, OUT xrscale, OUT texxscale, OUT texpos);


    // compute direction
    vec3 d = (skela1-skela).xyz;
    lll = length(d);
    xmu = lll == 0. ? vec3(0.,1.,0.) : d/lll;          // direction, will use as mu

    // almost correct code to use skelrad even if not in skeleton
    // would need to common up ggscale code from above, and work out best way to get oposz (do we really need it anyway???)
	//#define ggscale 1.
    //#define oposz 99999999.
    //xrscale = skelrad(xrscale / ggscale, ppx, oposz) * ggscale;


#endif
}  // trdir

/** compute the core transform ignoring sphere ends, ribby and star effects
ppx: distance along spine
parpos: definition of where in horn heirachy (parent pos)

OUT below
skela: resulting skeleton point
xmu: direction of spine travel
rad1a: direction of one radius
xrscale: scaled radius
texxscale: texture scale (but ...???)
texpos: texture position (but ...???)
lll: length of skeleton segment used to establish direction

 */
void coretr(const float ppx, const Parpos parpos, out vec4 skela, out vec3 xmu, out vec3 rad1a, out float xrscale, out float texxscale, out vec3 texpos, out float lll) {
    trdir(ppx, parpos, OUT skela, OUT xmu, OUT xrscale, OUT texxscale, OUT texpos, OUT lll);  // establish basic position

/******************/
    // and then find two radial directions from given forward direction xmu (T in TNB terminology)
    // We find one (unnormalized) radial direction rad1a here ((N in TNB), which is later crossed with xmu to give the second (B in TNB).
    // thus expand spine to surface position and mnormal, mu,mv
    // strategies to get 'first' radius
    //      NORMTYPE = 0, used a fixed direction, causes the tube to be 'flattened' as that direction nears xmu (TNB is not an orthonormal frame)
    //      NORMTYPE = 1, xmu cross random dir; we get a 180 degree twist where xmu equals the random direction.
    //                  This does not happen TOO often and is not TOO obtrusive when it does.
    //      NORMTYPE = 2, cross of two adjacent directions, random when all straight
    //      NORMTYPE = 3, use NORMTYPE = 2 method unless very nearly straight, in which if (walltype < NORMTYPE = 1 method
    //      NORMTYPE = 4, track an offset point through the transforms
    //                  This gives 'correct' twisting eg on pretwisted objects, for example
    //                      horn("Qfirst").ribs(20).radius(50).twist(500,0).stack(1200).bend(40,{k:"0."}).sub("Qsub");
    //                  NORMTYPE = 4 does not currently (June 2016) work if skelbuffer is enabled, skelbuffer loses the extra information needed.
    //                  NORMTYPE = 4 gives terrible rippling of slow animation and distorted normals  with moire lighting
    //      NORMTYPE = 5, uses eye direction rather than random direction, so the twists are always hidden.
    //                  This causes slight rippling as the grid moved on the object during object rotation, especially with low radnum
    //                  and causes issues withe star effect, 2d texture or other y effect
    //                  such as star rotating as the object rotates.
	//      NORMTYPE = 6, uses forward direction camera is pointing
	//                  Like 5 but with fixed forward direction rather than real eye direction
	// NORMTYPE is typically fixed for efficiently, but may be fed in as gene by changing its definition far above,
    const vec3 kkdir1 = vec3(1., 1.3, 2.1);
    ;
/**/
    float xrscale2, texxscale2; vec3 texpos2; // so texxscale not corrupted
    if (lll == 0. || NORMTYPE == 0.) {  // always use same direction
        rad1a = vec3(1.,0.,0.);
        lll = 1.;
    } else if (NORMTYPE == 1.) {  // cross with fixed direction
        rad1a = cross(xmu, kkdir1);

	// NB some of the NORMTYPEs below use tr_i, which does not use skelbuffer
    // This means that opos.vs is depended on tranrule.
    // It is also for using ribs which is not held in skeleton, but does not use tranrule transform, just which horntyupe
    } else if (NORMTYPE == 2.) {  // cross with next seg for centre of curvature
        // third sample ~~~~~~~~~~~~~~~
        // TODO need third sample if we are to get stars normal correct.
        // or even better track rotation through complete rule transform

        vec3 a2 = tr_i(base, ppx - 9.*sampdist, parpos, OUT xrscale2, OUT texxscale2, OUT texpos2).xyz;
        rad1a = cross(xmu, a2-skela.xyz);

    } else if (NORMTYPE == 3.) {  // cross with next seg for centre of curvature, but revert to type 1 if not bendy enough
        vec3 a2 = tr_i(base, ppx - 9.*sampdist, parpos, OUT xrscale2, OUT texxscale2, OUT texpos2).xyz;
        rad1a = cross(xmu, a2-skela.xyz);
        if (dot(rad1a, rad1a) < 0.000001)
            rad1a = cross(xmu, kkdir1);

    } else  if (NORMTYPE == 4.) {  // NORMTYPE 4  track offset sweep
        // track from random direction on xz plane
        vec3 a2 = tr_i(vec4(0.013,0., 0.017, 1.), ppx, parpos, OUT xrscale2, OUT texxscale2, OUT texpos2).xyz;  // track offset point
        rad1a = cross(xmu, a2-skela.xyz);

    } else if (NORMTYPE == 5.) {  // cross with vector away from eye
		// todo precompute  clearposA0 * rot4**-1
        vec3 rotsk = (skela * rot4).xyz;        // to rot space
        vec3 rotdir = clearposA0 - rotsk;       // in rot space
        vec3 prerotdir = mat3(rot4) * rotdir;   // back to 'correct' prerot space
        rad1a = cross(normalize(prerotdir), xmu);

    } else if (NORMTYPE == 6.) { // cross with vector in camera lookat direction
        rad1a = cross(awayvec, xmu);
    } else {
        rad1a = vec3(0,0,1);
    }

    //rad1a += vec3(0.01,1,1);
    //rad1a = normalize(rad1a);
    //ifNaN(rad1a, vec3(0,0,1));

    /*** other if (walltype <s used for test
    } else if (NORMTYPE == 10.) {
        rad1a = cross(rot4[0].xyz, xmu);
    } else if (NORMTYPE == 11.) {
        rad1a = cross(rot4[1].xyz, xmu);
    } else if (NORMTYPE == 12.) {
        rad1a = cross(rot4[2].xyz, xmu);
    } else if (NORMTYPE == 13.) {
        rad1a = cross(rot4[3].xyz, xmu);

    } else if (NORMTYPE == 20.) {
        rad1a = cross(vec3(rot4[0].x, rot4[1].x, rot4[2].x), xmu);
    } else if (NORMTYPE == 21.) {
        rad1a = cross(vec3(rot4[0].y, rot4[1].y, rot4[2].y), xmu);
    } else if (NORMTYPE == 22.) {
        rad1a = cross(vec3(rot4[0].z, rot4[1].z, rot4[2].z), xmu);
    } else if (NORMTYPE == 23.) {
        rad1a = cross(vec3(rot4[0].w, rot4[1].w, rot4[2].w), xmu);


    } else if (NORMTYPE == 31.) {
        rad1a = cross(vec3(1,0,0), xmu);
    } else if (NORMTYPE == 32.) {
        rad1a = cross(vec3(0,1,0), xmu);
    } else if (NORMTYPE == 33.) {
        rad1a = cross(vec3(0,0,1), xmu);
    ***/
}  // coretr

// overridable function for tailoring star shape
virtual vec2 makestar(Parpos parpos, vec4 loposuvw) {
    return vec2(nstar, stardepth);
}

// overridable function for tailoring ribdepth
virtual float makeribdepth(Parpos parpos, vec4 loposuvw) {
    return ribdepth * lribdepth;
    // return ribdepth * lribdeptha[clamp(int(xhornid), 0, MAXPATHS-1)];
}
// overridable function for tailoring ribs
virtual float makeribsraw(vec4 loposuvw) {
    #ifdef NOTR
        return 0.;
    #else
        return ribsa[clamp(int(xhornid), 0, MAXPATHS-1)];
    #endif
    // return ribsa[int(xhornid)];  // fails to compile with
}


// trnoflat does the normal rule, result may be modified by flatten
// It sets xmu,xmv,xmnormal and also the texture position (not correct/meaningful after optimizations, March 2015)
// Creates cylinder effect, rounded ends, ribbing and star effects. Assumes fleshed skeleton model even when no skeleton buffer used

vec4 trnoflat(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){  // 'real' tr () (not NO TR) passed from tr () to computeNormalsEtc

    // the index to choose which object instance may be held in modelMat rix[3][2], if we are using separate placed meshes
    // of may be held in p.z, if we are using some other layout arrangement (experimental as of 12/08/2013)
    // The values in parpos will be used by the automatically generated horn code inserted at $$ below
    // It is possible to compute parpos either just in the vertex shader, and pass as a varying,
    // or to compute in vertex shader and recompute in fragment shader.
    // Experiments indicate a very slight performance improvement for recomputation.
    Parpos parpos;            // used to hold position in each active horn, computed once in tr (), and used in tr_i()
    #ifdef usingskelbuffer
        parpos.aq.x = hhornnum;    // pass where in structure by abuse/reuse of parpos
    #else
        parpos = splitk(/*modelMat rix[3][2]*/ + hhornnum);  // establish position in parents for multi-grid
    #endif
/***/
	#ifdef SHEET
	{
		float xrscale, texxscale;  // set by tr_i and used to establish correct geometry
		float lll;
		vec3 skela, rad1a;

		// only applies if not using latenormals, eg usemask = 1 etc
		xmnormal = vec3(0,0,1);

		// void coretr(const float ppx, const Parpos parpos, out vec4 skela, out vec3 xmu, out vec3 rad1a, out float xrscale, out float texxscale, out vec3 texpos, out float lll)
		// coretr(loposuvw.x, parpos, OUT skela, OUT xmnormal, OUT rad1a, OUT xrscale, OUT texxscale, OUT texpos, OUT lll);
		// tr_i(const vec4 p, const float ppx, const Parpos parpos, out float xrscale, out float texxscale, out vec3 texpos)
		vec4 r = tr_i(loposuvw, loposuvw.x, parpos, OUT xrscale, OUT texxscale, OUT texpos);
		return r;
	}
	#endif
/***/

    // divide lennum up into three parts: spherenum front sphere: bodynum middle: spherenum end sphere
    // spherenum and bodynum integral so 'join' between body and end spheres happens at polygon border

    float spherenum = floor(lennum * capres * 0.5);
    bodynum = lennum - 2.*spherenum;
    float lo = -spherenum;
    float hi = bodynum+spherenum;
    vec4 ppp = rawp = loposuvw;   // raw input position; basically plane grid with z for id
    float rp = loposuvw.x;    // relative position along 'active' horn
    float rpx = lo + rp * (hi - lo);  // position extended beyond horn ends for rounding, range -r .. sbodynum+r
    float rpx1 = rpx/bodynum;
    float ppx = clamp(rpx1, 0., 1.);    // position along horn, range 0..1

    float xrscale, texxscale;  // set by tr_i and used to establish correct geometry
    vec3 rad1a; vec4 skela;
    vec3 xmu;
    float lll;

    coretr(ppx, parpos, OUT skela, OUT xmu, OUT rad1a, OUT xrscale, OUT texxscale, OUT texpos, OUT lll);
	// xrscale = max(xrscale, 0.);

    // define 'circle' to sweep, rrat gives the star shape
    // For now (Dec 2019) we have made makestar virtual to allow tailoring of nstar and stardepth
    // In future we may make the complete profile code virtual to allow more general profiles
    vec2 star = makestar(parpos, loposuvw);
    float unstar = star.x;
    float ustardepth = star.y;
    float star1 = ppp.y * unstar;
    float sss = 1.;  // relative depth for fraction
    if (star1 > floor(unstar)) {
        sss = fract(unstar);
        star1 = floor(unstar) + (star1 - floor(unstar))/sss;
    }
    float star4 = 1. - (1.-cos(star1 * 3.14159 * 2.))*sss*sss;
    float rrat = 1. - star4 * ustardepth; //  * ((xrscale < 50.) ? xrscale/50. : 1.);

    float xrscalea = xrscale*rrat;
#ifdef DOTEXPOS
    vec3 texposa1 = texpos;
    float xrscalea1 = xrscale*rrat;
#endif



/********************/

    // ribby as long as we are not at ends (or if HEADRIBS)
    // possible todo: flatten last partial rib to make better fit
    //rpx = rp;
    float lk = 0., fac = 1.;
    ribnum = 0.;  // TODO correct for rib at each end
	/**	sjpt temp, cost of ribs is around 2fps in 60 on VR test **/
    float uribs = makeribsx(loposuvw);
    float uribdepth = makeribdepth(parpos, loposuvw);
    #ifdef HEADRIBS
    	float xrp = min(ppx, 1.-ppx ); // extra ribs from centre so head and tail undisturbed
    #else
    if (0. < rpx && rpx < bodynum) {
    	float xrp = ppx;         // old style
    #endif
    lk = (xrp * uribs + 0.5);
    ribnum = floor(lk);
    lk = fract(lk);             // 0..1, ramp
    lk = abs(lk - 0.5);         // 0..0.5 sawtooth
    fac = sqrt(1. - uribdepth*lk*lk);      // intersecting 'spheres'
    xrscalea *= fac;
    //r *= 1. - uribdepth*sin(pi2 * rpx * ribs / bodynum);
    // should we adjust the normal here?
    #ifndef HEADRIBS
    }
    #endif
	/**/
    #if OPMODE == OPOPOS && VERTEX == 1 && defined(SHARPPOINT)
        vxrscale = xrscalea;
    #endif

    vec3 rad2 = normalize(rad1a);
    // second radius cross of direction and first radius
    vec3 rad1 = -normalize(cross(xmu, rad2));
    float s = sin(ppp.y * 2. * pi);
    float c = cos(ppp.y * 2. * pi);
    xmnormal = -s * rad1 + c * rad2;  // -s generates front facing polygons
    //xmv = c * rad1 - s * rad2;
    vec3 surfpos = skela.xyz + xrscalea * xmnormal;  // <<< 4d sweeping does not work correctly here

    xmnormal += xmu * (uribdepth * lk / fac);  // from derivative of fac
    xmnormal = normalize(xmnormal);

#ifdef DOTEXPOS
    vec3 texposa = texpos;
#endif

    // repeat to find texpos on surface
#ifdef DOTEXPOS
    vec3 texxmu = (texposa1-texposa);          // direction
    if (length(texxmu) == 0.) texxmu = vec3(0., 0., 1.);
    rad1 = normalize(cross(texxmu, vec3(1., 1.3, 2.1)));
    rad2 = normalize(cross(texxmu, rad1));
    // TODO: texpos should probably be computed using radius active at texpos capture point
    texpos = texposa + vec3(xrscalea * texxscale * xmnormal);
//??? This is totally wrong, letting the texture adjust our normal (the bump texture will do that later)
//??? It may be the (???) correct way to adjust the normal for ribbing, in which if (walltype < it belongs outside #ifdef DOTEXPOS
//???    xmnormal += (xrscalea - xrscalea1)/lll * texxmu;
//???    xmnormal = normalize(xmnormal);
#endif

/** sjpt comment for timing test, head and tail costing very little **/
if (rpx > bodynum) {  // sphere at tail. force points equal round end circle, not along length. rpx bodynum..bodynum+r
        //float r = spherenum;
        float aa = (rpx-bodynum)/spherenum*pi/2.;  // real radius was used to compute rpx, a in 0..pi/2
        vec3 xxmnormal = sin(aa) * xmu +  cos(aa) * xmnormal;
        surfpos = skela.xyz + xrscalea * xxmnormal;
#ifdef DOTEXPOS
        texpos = texposa + vec3(xrscalea * texxscale * xxmnormal);
        xmu = cos(aa) * xmu - sin(aa) * xmnormal;
        xmnormal = xxmnormal;
#endif
    }

if (rpx < 0.) {  // sphere at head. force points equal round end circle, not along length. rpx bodynum..bodynum+r
        //float r = spherenum;
        float aa = (rpx)/spherenum*pi/2.;  // real radius was used to compute rpx, a in 0..pi/2
        vec3 xxmnormal = sin(aa) * xmu +  cos(aa) * xmnormal;
        surfpos = skela.xyz + xrscalea * xxmnormal;
#ifdef DOTEXPOS
        texpos = texposa + vec3(xrscalea * texxscale * xxmnormal);
        xmu = cos(aa) * xmu - sin(aa) * xmnormal;
        xmnormal = xxmnormal;
#endif
    }
/*** end timing test ***/

	xmnormal *= reflnorm;

	texpos = surfpos;

    return vec4(surfpos, skela.w);  // w may not take part in sweeping, but at least it is not forgotten
}	// end real tr () (! NO TR)


gene(makeflat, 0.0, 0,1.1, 0.1, 0.01, geom, frozen) // set to 1 to make flat with algorithm, >1 for 'pure' flat and no call to trnoflat
gene(flatx, 800, 0,10000, 1, 1, geom, frozen) // x multiplier for flat
gene(flatxfrominst, 0, 0,10000, 1, 1, geom, frozen) // x multiplier of instance for flat
gene(flaty, 800, 0,10000, 1, 1, geom, frozen) // y multiplier for flat
gene(flatz, 1, 0,10000, 1, 1, geom, frozen) // z multiplier for flat

/**
tr outputs a transformed position as result.

Calls trnoflat to do almost all real work.
Also allows for flatten, usually show fully wrapped, but can show as original planes, or inbetweens

Output xmnormal usually ignored? and computed later by latenormals
*/
virtual vec4 trhorn(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){  // 'real' tr () (not NO TR) passed from tr () to computeNormalsEtc
	pickopos(loposuvw);

    // make sure TRIVIALTR defined
    #ifndef TRIVIALTR
        #define TRIVIALTR 0
    #endif

    // chose what kind of transform
    #if TRIVIALTR == 0  // pure horn
        vec4 r = trnoflat(loposuvw, xmnormal, texpos, ribnum);
    #else
        vec4 f = (loposuvw - vec4(0.5, 0.5, 0.5*horncount, 0.)) * vec4(flatx, flaty, flatz/horncount, 0.);
        f.x += flatxfrominst/horncount*hhornnum;
        #if TRIVIALTR == 1 // mixture horn/flat
            vec4 r = (makeflat > 1.) ? f : mix(trnoflat(loposuvw, xmnormal, texpos, ribnum), f, makeflat);
        #else   // pure flat
            vec4 r = f;
        #endif
    #endif

	// r.w = 1.;  // kills 4d, but needed to make pan work in 3d ... and should always be true in 3d (to verify)?
	return r;
}

#ifdef NOTR
vec4 tr(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){ return trwall(loposuvw, xmnormal, texpos, ribnum); }
#else
vec4 tr(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){ return trhorn(loposuvw, xmnormal, texpos, ribnum); }
#endif

#if (OPMODE == OPMAKESKELBUFF && VERTEX == 1)
/** comupute xyz position in skeleton, and 4d w in w (usually 0 in 3d) NONONONO and scaled radius in w position */
vec4 trskel(const vec4 p) {
    Parpos parpos;
	// used to hold position in each active horn
    parpos = splitk(/*modelMat rix[3][2]*/ + p.z);  // establish position in parents for multi-grid

    float xrscale, texxscale;  // set by tr_i and used to establish correct geometry
    vec3 texpos;                        // set by tr_i (and ignored for now? */

    vec4 skelpos = tr_i(base, p.x, parpos, OUT xrscale, OUT texxscale, OUT texpos) * rot44d;
    skelpos.w = 1.;

    // inside-out or other distortion to prevent getting too close
    vec3 trpos = (vec4(skelpos) * rot4).xyz;

	// was skelpos.w * xrscale below, but skelpos.w is a 3d position NOT a radius
/// no ## support in low levels of GLSL
//// ##### #define cclear(X) {  /* clear round clearposA */ \
    float low = shrinkradius##X + xrscale, high = low * shrinkfactor; \
    float ll = length(clearpos##X##0 - trpos);   /* distance to camera */ \
    float k = (ll-low) / (high - low); \
    k = clamp(k, 0., 1.); \
	xrscale *= sqrt(k); \
	}

    // NOTE: abs(xrscale) in code below prevents interference with -ve radius test for broken segments (AAAA)
    if (shrinkradiusA > 0.) {  // clear round clearposA
    float low = shrinkradiusA + abs(xrscale), high = low * shrinkfactor;
    float l0 = length(clearposA0 - trpos);   // distance to controller
    float l1 = length(clearposA1 - trpos);   // distance to controller
    float lcc = length(clearposA1 - clearposA0);   // distance to controller
	float ll = (l0 + l1 - lcc) * 0.5;  // length to use for ellipse
    float k = (ll-low) / (high - low);
    k = clamp(k, 0., 1.);
    xrscale *= sqrt(k);
	}


    if (shrinkradiusB > 0.) {  // clear round clearposB
    float low = shrinkradiusB + abs(xrscale), high = low * shrinkfactor;
    float l0 = length(clearposB0 - trpos);   // distance to controller
    float l1 = length(clearposB1 - trpos);   // distance to controller
    float lcc = length(clearposB1 - clearposB0);   // distance to controller
	float ll = (l0 + l1 - lcc) * 0.5;  // length to use for ellipse
    float k = (ll-low) / (high - low);
    k = clamp(k, 0., 1.);
	// k = 1. - k;  // temp, enhancer
    xrscale *= sqrt(k);
	}


    skelpos.w = xrscale;
    return skelpos;
}
#endif
/**
vec4 tr (const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){  // flatten option for no (or semi) tr
  vec4 trnoflat(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){  // 'real' tr ()
	void coretr(const float ppx, const Parpos parpos, out vec4 skela, out vec3 xmu, out vec3 rad1a, out float xrscale, out float texxscale, out vec3 texpos, out float lll)
		void trdir(const float ppx, const Parpos parpos, out vec4 skela, out vec3 xmu, out float xrscale, out float texxscale, out vec3 texpos, out float lll)
			vec4 tr_i(const vec4 p, const float ppx, const Parpos parpos, out float xrscale, out float texxscale, out vec3 texpos)


tr_i  		basic transform including GPUSCALE, and w if relevant NONONO and outputs position and (scaled) radius
trdir 		computes position and forward direction (mu), uses skelbuffer if possible (2 linear or 4 cubic texture calls), or tr_i (2 horn calls)
coretr		pos and forward pos (from trdir) and radia radius (using NORMTYPE)
trnoflat	creates cylinder effect, rounded ends, ribbing and star effects. Assumes fleshed skeleton model even when no skeleton buffer used
tr			applies flatenning if used


transformation pipe
                                                skelpos                               shapepos    trpos             mtrpos                ooo
                                                    |                                     |          |                  |                   |
| ------------------ tr_i -----------------------|  | trskel |  |--------- tr -----------| |-four.fs-|------ threek.vs--+-------------------+--------------|
  |tranrule autoscale gpuscale | xrscale=xscale*r|    clearpos    cyl star ribs tail head     rot4     modelViewMatrix    projectionMatrix     distortpix
 pretranrule             posttranrule            |      uses
                                                 |      rot4
                                              radadd &c
CSynth tranrule
includes scaleFactor
* autoscale is implemented in different ways for gpuscale and cpuscale, but the effect should be the same
    see #ifdef GPUSCALE in this file around line 815
* where springs are used, spring values are typically PRE autoscale, and skelbuffer values POST autoscale
    spring values are not autoscaledskeleton values are autoscaled
    (unless it is turned off)autoscaling attempts to make the object size around basescale
* basescale is typically 655 (to fit in default room of 1000 units)
    we might change basescale to fix in better with real size in metres


*/
#endif // NOHORNMAKER
// end hornmaker.vs <<<<
