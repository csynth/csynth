'use strict';
/**
This is the main core of the spring model.
The basic data array is the posWorkhist array.
The y direction holds different particles,
the x direction holds a circular time buffer;
hence posWorkhist[time, part] gives the position of a particle at a given time.

Each cycle draws a line through a single x value,
and each call to the fragment shader performs a calculation for a single time slot, single particle.
Each spring is thus calculated twice each time slot, once for each end particle.

*/
var addtaggeduniform, addgeneperm, getdata, uniformsForTag, springs, G, uniforms, ffloat, Springs, torsionSprings, THREE, inps, CSynth;

const springUniformCache = {};
/** set the uniforms and genes used by springs */
function getSpringUniforms(springModel = springs) {
    const id = springModel.id;
    const cacheID = springModel.toString();
    //myParms to take place of 'currentGenes' / G when there's an id specified.

    ///....why is (!'boostfac' in G) ???
    //if (springUniformCache[cacheID] && 'boostfac' in G) return springUniformCache[cacheID];
    if (springUniformCache[cacheID]) return springUniformCache[cacheID];

    const myUniforms = id ? {} : uniforms;
    const myParms = id ? {} : G;
    springUniformCache[cacheID] = [myUniforms, myParms];

    const addTaggedUniform_withID = function() {
        //arguments[1] = arguments[1] + id;
        if (!id) addtaggeduniform(...arguments);
        else {
            myUniforms[arguments[1]] = {
                value: arguments[2], type: arguments[3]
            }
        }
    };
    const addGenePerm_withID = function(name, def, min, max, delta, step, help, tag, free, internal) {
        //arguments[0] = arguments[0] + id;
        if (!id) addgeneperm(...arguments);
        else {
            // myUniforms[arguments[0]] = {
            //     value: arguments[1], type: 'not a shader uniform', tip: arguments[6]
            // }
            // console.log(`addGenePerm ${JSON.stringify( myUniforms[arguments[0]] )}`);
            myParms[name] = def;
            myUniforms[name] = {value: def, min: min, max: max, help: help};
        }
    };


    addTaggedUniform_withID('springs', 'stepsSoFar', 0, 'f', false);
    addTaggedUniform_withID('springs', 'WORKHISTLEN', undefined, 'f', false);
    addTaggedUniform_withID('springs', 'HISTLEN', undefined, 'f', false);
    addTaggedUniform_withID('springs', 'workhisttime', 0, 'f', false);
    addTaggedUniform_withID('springs', 'histtime', 0, 'f', false);
    addTaggedUniform_withID('springs', 'settle', 0, 'f', false);    // set to 1  to force shader to copy old value to new

    addTaggedUniform_withID('springs', 'numInstances', 0, 'f', false);    // set to 1  to force shader to copy old value to new
    addTaggedUniform_withID('springs', 'numInstancesP2', 0, 'f', false);    // set to 1  to force shader to copy old value to new


    addTaggedUniform_withID('springs', 'posNewvals', undefined, "t", false);
    addTaggedUniform_withID('springs', 'posHist', undefined, "t", false);
    addTaggedUniform_withID('springs', 'posWorkhist', undefined, "t", false);
    addTaggedUniform_withID('springs', 'topologybuff', undefined, "t", false);
    addTaggedUniform_withID('springs', 'contactbuff', undefined, "t", false);
    addTaggedUniform_withID('springs', 'distbuff', undefined, "t", false);
    addTaggedUniform_withID('springs', 'pullskelbuff', undefined, "t", false);
    addTaggedUniform_withID('springs', 'pullskelwidth', 8, "i", false);
    addTaggedUniform_withID('springs', 'springCentre', new THREE.Vector3(), "v3", false);
    addTaggedUniform_withID('springs', 'springRotate', new THREE.Matrix4(), "m4", false);   // rotation between spring positions and 'real' positions


    addTaggedUniform_withID('springs', 'maxv', undefined, "f", false);
    addTaggedUniform_withID('springs', 'representativeContact', undefined, "f", false);
    addTaggedUniform_withID('springs', 'gradField', undefined, "t", false);  // 'field to compute gradient',
    addTaggedUniform_withID('springs', 'gradnum', new THREE.Vector3(), "v3", false);
    addTaggedUniform_withID('springs', 'gradysplit', new THREE.Vector2(), "v2", false);
    addTaggedUniform_withID('springs', 'gradlow', new THREE.Vector3(), "v3", false);
    addTaggedUniform_withID('springs', 'gradhigh', new THREE.Vector3(), "v3", false);
    addTaggedUniform_withID('springs', 'gradtran', new THREE.Matrix4(), "m4", false);
    addTaggedUniform_withID('springs', 'pullspringmat', new THREE.Matrix4(), "m4", false);

    // name, def, min, max, delta, step, help, tag, free, internal
    addGenePerm_withID("damp", 0.995, 0,1, 0.01, 0.001, "damping factor", "springs", "frozen");
    addGenePerm_withID("visc", 0, 0,1, 0.01, 0.001, "viscocity factor", "springs", "frozen");
    addGenePerm_withID("viscpow", 1, 0,3, 0.01, 0.001, "viscocity power factor, 1 viscous, 2 turbulent", "springs", "frozen");
    addGenePerm_withID("springrate", 1, 0,10, 0.1, 0.1, "velocity multipler for global speed", "springs", "frozen");
    addGenePerm_withID("stepsPerStep", 1, 1, 50, 5, 1, "simulation steps for each step call", "springs", "frozen");
    addGenePerm_withID("springlen", 1, 0,5, 0.1, 0.01, "spring length multiplier", "springs", "frozen");
    addGenePerm_withID("springlenfix", 0, 0,5, 0.1, 0.01, "fixed length to add to all springs", "springs", "frozen");
    addGenePerm_withID("nonBackboneLen", 1, 0,5, 0.1, 0.1, "length multiplier for non-backbone springs", "springs", "frozen");
    addGenePerm_withID("backboneStrength", 10, 0, 25, 0.1, 0.01, "relative strength of backbone springs to strongest other", "springs", "frozen");
    addGenePerm_withID("backboneScale", 1, 0, 10, 0.1, 0.01, "base expected length of backbone spring", "springs", "frozen");

    addGenePerm_withID("springforce", 0.001, 0, 1, 0.01, 0.001, "spring force", "springs", "frozen");
    addGenePerm_withID("backboneforce", 0, 0, 1, 0.01, 0.001, "backbone force for regular lengths (pairs style)", "springs", "frozen");
    addGenePerm_withID("contactforce", 0.0, 0, 100, 1, 1, "pairwise contact force", "springs", "frozen");
    addGenePerm_withID("contactforcesc", 0.0, 0, 1, 0.01, 0.001, "pairwise contact force, scaled", "springs", "frozen");

    addGenePerm_withID("pullspringforce", 0, 0, 1, 0.01, 0.001, "pull spring force (to given position)", "springs", "frozen");
    addGenePerm_withID("pullfixdamp", 0, 0, 1, 0.01, 0.001, "damp towards using pull spring as fix (0, no effect, 1 jump to pull", "springs", "frozen");

    addGenePerm_withID("pullskelforce", 0, 0, 1, 0.01, 0.001, "pull spring force to skeleton", "springs", "frozen");
    addGenePerm_withID("pullskelscale", 1, 0, 3, 0.0001, 0.0001, "skeleton scale for pullskel", "springs", "frozen");

    //addgeneperm("contactforce2", 0.0, 0, 1, 0.01, 0.001, "pairwise contact force", "springs", "frozen");
    //addgeneperm("contactforce2pow", 0, -2, 2, 1, 0.1, "contact distance power", "springs", "frozen");
    //addgeneperm("contactforce2len", 0, -2, 2, 1, 0.1, "contact distance length", "springs", "frozen");
    addGenePerm_withID("xyzMaxDist", 5, 0, 10, 0.1, 0.01, "max dist for making spring from coord data", "springs", "frozen");
    addGenePerm_withID("xyzforce", 0.0, 0, 1, 0.01, 0.001, "pairwise xyz force", "springs", "frozen");
    addGenePerm_withID("xyzpow", 0.5, 0, 2, 0.01, 0.001, "power falloff of pairwise xyz force", "springs", "frozen");
    addGenePerm_withID("contactthreshold", 0, 0, 0.1, 0.001, 0.001, "contact threshold, values below this ignored", "springs", "frozen");
    addGenePerm_withID("springmaxvel", 0.25, 0, 1, 0.01, 0.001, "max velocity", "springs", "frozen");
    addGenePerm_withID("springpow", 0, -2, 2, 1, 0.1, "spring falloff/increase power", "springs", "frozen");
//    addGenePerm_withID("springdiffpow", 0, -2, 2, 1, 0.1, "spring falloff/increase power based on distance error", "springs", "frozen");
//    addGenePerm_withID("springzeropow", 0, -2, 2, 1, 0.1, "extra spring falloff/increase for 0 length springs", "springs", "frozen");
    addGenePerm_withID("pushapartdelta", 0, -2,3, 0.1, 0.01, "pushapart delta length, added to nonBackboneLen for pushapsrt length", "springs", "frozen");
//    addGenePerm_withID("pushapartcut", 0.1, 0, 1, 0.01, 0.001, "distances < this culled", "springs", "frozen");
    addGenePerm_withID("pushapartforce", 0, 0, 0.004, 0.0001, 0.0001, "pushapart force", "springs", "frozen");
    addGenePerm_withID("pushapartpow", 0, -4, 2, 0.01, 0.01, "pushapart falloff/increase power (relative to springpow)", "springs", "frozen");
    addGenePerm_withID("powBaseDist", 100, 1, 1000, 1, 1, "distance at which changing pow values leaves forces unchanged", "springs", "frozen");
    addGenePerm_withID("ignoreBackbone", 0, 0, 1, 1, 1, "ignore backbone, always pushapart", "springs", "frozen");


    addGenePerm_withID("pushapartlocalforce", 0.2, 0, 1, 0.01, 0.01, "pushapart local force", "springs", "frozen");
    addGenePerm_withID("pushapartDensityFactor", 0, 0, 1, 0.01, 0.01, "extra local pushapart when dense", "springs", "frozen");
    addGenePerm_withID("pushapartDensityPow", -1, -4, 2, 1, 0.1, "pushapart density falloff/increase power (relative to springpow)", "springs", "frozen");
    addGenePerm_withID("noiseprob", 1, 0, 1, 0.001, 0.001, "probability of noise on each particle in a given step", "springs", "frozen");
    addGenePerm_withID("noiseforce", 0, 0, 0.1, 0.001, 0.001, "noise force", "springs", "frozen");
    addGenePerm_withID("gradforce", 0, 0, 1, 0.01, 0.01, "gradient field force", "springs", "frozen");

    addGenePerm_withID("noisefieldforce", 0, 0, 1, 0.01, 0.01, "noise field force", "springs", "frozen");
    addGenePerm_withID("noisefieldscale", 1, 0, 10, 0.01, 0.01, "noise field scale", "springs", "frozen");
    addGenePerm_withID("noisefieldtimefac", 1, 0, 10, 0.01, 0.01, "noise field time factor", "springs", "frozen");
    addGenePerm_withID("noisefieldpartfac", 1, 0, 10, 0.01, 0.01, "noise field particle factor", "springs", "frozen");
    addGenePerm_withID("noisefieldmod", 1, 0, 10, 0.01, 0.01, "noise field mod, which particles to hit", "springs", "frozen");

    addGenePerm_withID("fractforce", 0.0, 0, 0.1, 0.001, 0.001, "fractal force", "springs", "frozen");
    addGenePerm_withID("fractpow", -2, -4, 2, 1, 0.01, "fractal power", "springs", "frozen");

    addGenePerm_withID("boostx", 0.4, 0, 1, 0.01, 0.01, "x for boost region", "springs", "frozen");
    addGenePerm_withID("boosty", 0.6, 0, 1, 0.01, 0.01, "y for boost region", "springs", "frozen");
    addGenePerm_withID("boostrad", 0.01, 0, 1, 0.001, 0.001, "radius for boost region", "springs", "frozen");
    addGenePerm_withID("boostfac", 0, 0, 100, 1, 1, "boost factor in centre of boost region", "springs", "frozen");

    addGenePerm_withID("torsionspringforce", 0.1, 0, 1, 0.000001, 0.000001, "torsion spring force", "springs", "frozen");
    addGenePerm_withID("backbonetorsionspringforce", 0, 0, 0.00002, 0.000001, 0.000001, "backbone torsion spring force, if set all backbone has automatic torsion springs", "springs", "frozen");
    addGenePerm_withID("backbonetorsionspringangle", -0.6, -3.15*2, 3.15*5, 0.01, 0.01, "backbone torsion spring angle", "springs", "frozen");
    addGenePerm_withID("backbonetorsionspringconst", 0, -1e-6, 1e-6, 1e-8, 1e-8, "const extra torsion force", "springs", "frozen");
    addGenePerm_withID("springCentreDamp", 1, 0, 1, 0.001, 0.001, "factor to centre each particle to origin", "springs", "frozen");
    addGenePerm_withID("backbonetorsionspringdist", 1, 1, 50, 1,1, "backbone torsion spring distance", "springs", "frozen");
    addGenePerm_withID("gravity", 0.000, -0.001, 0.001, 0.00001, 0.00001, "gravity", "springs", "frozen");

    addGenePerm_withID('regionBoundary', -999, 0,1, 0.01, 0.01, 'region boundary', 'springs', 'frozen');
    addGenePerm_withID("nonRegionLen", 1, 0, 20, 0.1, 0.1, "length multiplier for cross-region springs", "springs", "frozen");

    addGenePerm_withID('modelSphereForce', 0, 0,1, 0.01,0.01, 'force to keep in sphere',  'springs', 'frozen');
    addGenePerm_withID('modelSphereRadius', 100, 50,200, 1,1, 'sphere radius to contain model',  'springs', 'frozen');

    addGenePerm_withID('m_alpha', 1.1, 0,3, 0.01,0.01, 'alpha for Missouri model',  'springs', 'frozen');
    addGenePerm_withID('m_c', 10, 1, 250 , 0.1, 0.1, 'c for Missouri model',  'springs', 'frozen');
    addGenePerm_withID('m_k', 4, 0,50, 0.01,0.01, 'k (scale) for Missouri model',  'springs', 'frozen');
    addGenePerm_withID('m_force', 0, 0,3, 0.1,0.1, 'force scale for Missouri model',  'springs', 'frozen');


    addGenePerm_withID("maxBackboneDist", 1, 0, 1, 0.1, 0.01, "max backbone distance to use, on scale 1 for all", "springs", "frozen");
    addGenePerm_withID("minActive", 0, 0.0, 0.98, 0.001, 0.001, "min active particles, on scale 1 for all", "springs", "frozen");
    addGenePerm_withID("maxActive", 1, 0.02, 1, 0.001, 0.001, "max active particles, on scale 1 for all", "springs", "frozen");

    addGenePerm_withID("histStepsPerSec", 25, 1, 50, 5, 1, "history steps per second", "springs", "frozen");
    addGenePerm_withID("patchval", 1, 0, 50, 0.1, 0.1, "patch strength for backbone with missing contacts", "springs", "frozen");
    addGenePerm_withID("patchwidth", 1.5, 0, 50, 0.1, 0.1, "patch width for backbone with missing contacts", "springs", "frozen");

    addGenePerm_withID("randvecscale", 1, 0, 2, 0.0001, 0.0001, "scale of random vector (for position of hidden particles", "springs", "frozen");
    addGenePerm_withID("perturbScale", 50, 0, 100, 0.1, 0.01, "scale of spring position perturbatiuon", "springs", "frozen");


    return [myUniforms, myParms];
}

/** use of some forces, especially wrt backbone zzz
 *                       pairs    single
 *                                  !nb      |  must be explicitly sepecified as a spring
 * backboneforce           x                 |  strength of backbone force
 * backboneScale           x                 |  used for localPushApart and backboneforce (***)
 * nonBackboneLen          x                 |  closest for non-backbone (relative to backboneScale) (***)
 * backboneStrength                  x       |  multiplier of 'standard' force for backbone
 * springforce                       x       |  factor for (almost?) all single springs; also roleforce
 * roleforce                         X       |  allow to scale by role
 * roleforceFix                      X       |  + fixed (nonscaled extra) (springforce*roleforce)+roleforceFix
 * springlen/springlenfix            X       |  scale up all spring lengths
 *                            |
 * maxBackboneDist         x         x       |  which part in use, also minActive, maxActive.  not related to backbone
 *                            |
 *                            |
 *
 * (***) 17 Dec 2019 backboneScale and nonBackboneLen were used with single spring
 *       but the code there was not appropriate
 */

function setspringshaders(springModel, numInstancesP2, numInstances, MAX_DEFS_PER_PARTICLE) {
    //XXX
    getSpringUniforms(springModel);
    if (!torsionSprings) {
        torsionSprings = ()=>'';
        torsionSprings.use = false;
    }

const vert = /*glsl*/`
/// Vertex shader entry. PAINT A STRIPE AT CORRECT TIME
varying float part;  // my particle number range 0..1 ready for texture lookup
attribute vec3 position;
void main()
{
    // input range is 0..1, so part ranges 0..1 and gl_Position.y -1..1
    part = position.y;
	gl_Position = vec4(0.,position.y * 2. - 1.,0.0,1.0);
}`


const frag = /*glsl*/`
// #extension GL_ARB_gpu_shader_fp64 : enable
precision highp float;

#define NOSPRING float(${springModel._NOSPRING})
#define ROLEFORCESLENGTH ${springs._ROLEFORCESLENGTH}
${inps.PUSHPAIRS ? '#define PUSHPAIRS' : ''}
${inps.SMALLPAIRS ? '#define SMALLPAIRS' : ''}
uniform float roleforces[ROLEFORCESLENGTH];
uniform float roleforcesFix[ROLEFORCESLENGTH];
uniform float time;         // for noise
${uniformsForTag('springs') //<<---------- probably harmless?
}

//uniform float pushbase;  // base distance for push, anything above this is pushed away
//uniform float pushmin;   // min dist, slight > pushbase


varying float part;           // particle backbone position, ranges from 0..1 (actdually off to 1-off)
uniform sampler2D scaleDampTarget;  // used for pull to dynamc skeleton

// uniform sampler2D topologybuff;  // the data arrray use to set up spring/particle topology
// this buffer is indexed in y by particle number
// and for each particle is indexed in x by a spring from that particle.
// MAX_DEFS_PER_PARTICLE possible definitions
// Definitions are
// 0,1,2,3: spring
// 4: rod
// 5: fix
// Each spring has x->other end particle, y->springlen, z->springforce.
// Thus each spring appears twice, once under each particle.
//
// Setup of topologybuff array in springs.js

// The shader code always uses VnumInstances/VnumInstancesP2
// If me.VARY is not set these are defined as constants
// and code must be recompiled as numInstances/numInstancesP2 changes
// but the loops may be more efficient.
// (The uniforms are avaulable but unused.)
//
// If me.VARY is set these are set from uniforms numInstances/numInstancesP2
// The code will work for different uniform values
// but the loop is less efficient.

// Tests on Crick lots and 1080 indicate the loss is only around 1 or 2 percent;
// this may well vary on other hardware.
// -ve VARY uses fixed values and long loop
// 0 VARY uses fixed values and fixed loop (default for now)
// >0 VARY uses uniform values and long loop (potential future default)
// uniform values and fixed loop generates invalid GLSL for GLES2
#define VARY ${springModel.VARY || 0}

#if VARY <= 0
#define VnumInstancesP2 ${ffloat(numInstancesP2)}
#define VnumInstances ${ffloat(numInstances)}
#define ACTIVERANGE ${ffloat((numInstances + 0.5)/numInstancesP2)}
#define SMALLTEXTURE ${ffloat(numInstancesP2/numInstances)}       // for lookup in numInstance sized texture
#define INVPARTICLESP2 ${ffloat(1/numInstancesP2)}
#else
#define VnumInstancesP2 numInstancesP2
#define VnumInstances numInstances
#define ACTIVERANGE ((numInstances + 0.5)/numInstancesP2)
#define SMALLTEXTURE (numInstancesP2/numInstances)
#define INVPARTICLESP2 (1.0/numInstancesP2)
#endif

#define MAX_DEFS_PER_PARTICLE ${ffloat(MAX_DEFS_PER_PARTICLE)}


// These constants show the locations in the texture used to extract different spring details
//const float MAX_DEFS_PER_PARTICLE = 8.0;
const float SPRINGS = MAX_DEFS_PER_PARTICLE - float(${springModel.NUMSPECIALS});
const float spstart = 0.5 / MAX_DEFS_PER_PARTICLE;
const float spstep = 1.0 / MAX_DEFS_PER_PARTICLE;
const float spend = SPRINGS / MAX_DEFS_PER_PARTICLE;
const float rodpos = (SPRINGS + 0.5) / MAX_DEFS_PER_PARTICLE;
const float fixpos = (SPRINGS + 1.5) / MAX_DEFS_PER_PARTICLE;
const float pullpos = (SPRINGS + 2.5) / MAX_DEFS_PER_PARTICLE;
float currt;            // last time for which data saved in workhist

#define virtual
virtual vec3 customForce(vec3 mypos) { return vec3(0.); }

${window.THREE.ShaderChunk.O_noiseGLSL}
// inefficent 3d texture noise field
vec3 noisefield(vec3 texpos, float d) {
    // float a = snoise(texpos);
    // return vec3(snoise(texpos+vec3(d,0,0)), snoise(texpos+vec3(0,d,0)), snoise(texpos+vec3(0,0,d)));
    return vec3(snoise(texpos), snoise(texpos.yzx), snoise(texpos.zxy));
}
vec3 noisefield(vec4 texpos) {
    // float a = snoise(texpos);
    // return vec3(snoise(texpos+vec3(d,0,0)), snoise(texpos+vec3(0,d,0)), snoise(texpos+vec3(0,0,d)));
    // ... return vec3(snoise(texpos.xyw), snoise(texpos.ywz), snoise(texpos.wzx));
    return vec3(cnoise(texpos), cnoise(texpos.yzwx), cnoise(texpos.xwxy)); // cnose is real 4d

}


bool isNaN(float v) { return !(v <= 0. || v >= 0.); }
bool isNaN(vec3 v) { return isNaN(v.x + v.y + v.z); }
bool isNaN(vec4 v) { return isNaN(v.x + v.y + v.z + v.w); }
float lengthSquared(vec3 a) { return dot(a,a); }
/** convenience function to find position of particle o now */
vec3 poso(float o) { return texture2D(posWorkhist, vec2(currt, o)).xyz; }
vec4 poso4(float o) { return texture2D(posWorkhist, vec2(currt, o)); }
/** convenience function to find position of particle o at time t */
vec3 posot(float o, float t) { return texture2D(posWorkhist, vec2(t, o)).xyz; }

float distsq(vec3 x, vec3 y) { vec3 d = x-y; return dot(d,d); }
float nearpointOnLine(vec3 p, vec3 l1, vec3 l2, out vec3 nearp) {
    vec3 dd = l2 - l1;
    vec3 d1 = p - l1; //, d2 = l2 - p;
    float ldsq = dot(dd,dd);
    if (ldsq == 0.) { nearp = l1; dd = p - l1; return 0.; }
    float t = dot(d1, dd) / ldsq;
    t = clamp(t, 0., 1.);
    nearp = l1 + t * dd;
    return t;
    // return distsq(p, nearp);
  }

  float nearpointOnInfLine(vec3 p, vec3 l1, vec3 l2, out vec3 nearp) {
    vec3 dd = l2 - l1;
    vec3 d1 = p - l1; //, d2 = l2 - p;
    float ldsq = dot(dd,dd);
    if (ldsq == 0.) { nearp = l1; dd = p - l1; return 0.; }
    float t = dot(d1, dd) / ldsq;
    // not for Inf t = clamp(t, 0., 1.);
    nearp = l1 + t * dd;
    return t;
    // return distsq(p, nearp);
  }


// soft clipping, rr is range 0 to infinity, ss (internal) is soft clipped value, rat is multiplier needed to bring to soft value
float soft(float rr) {
    float softt = 0.7;
    float rat = 1.;
    if (rr > softt) {
        float ss = 1. - (1.-softt)*(1.-softt) / (rr + 1. - 2.* softt);  // range 0..1
        rat = ss/rr;    // multiplier to reduce value
    }
    return rat;
}


#define len2(a,b) dot(a-b, a-b)

// helper for spring boosting
float boost(float part, float opart) {
    // boost springs near boost position
    // very basic protoplasmic editing
    // hints for use ...
    // G.boostx = 0.4; G.boosty = 0.6; G.boostrad = 0.01; G.boostfac = 100
    float b = 1.;  // result
    if (boostfac > 0.) {                            // yes, we are in boosting mode
        vec2 boostcen = vec2(boostx, boosty);       // centre of boost region
        float d2 = min(
            len2(boostcen, vec2(part, opart)),      // d2 = distance squared current to centre
            len2(boostcen, vec2(opart, part)));
        float boostrad2 = boostrad * boostrad;      // radius squared of region
        if (d2 < boostrad2) {                       // inside boost region
            float r2 = d2 / boostrad2;              // distance relative to size of boost region
            b = 1. + (r2*r2 - 2.*r2 + 1.) * boostfac;   // shaped boosting
        }
    }
    return b;
}

${torsionSprings()}

// compute the effect of regular (addspring topology style) spring on me, and return force vector
// NOT for pull, fix, rod
vec3 spring(vec3 mypos, vec4 spr) {

    // split spr.x to find other end and spring type
    float roleforce = 1., roleforceFix = 0.;
    if (spr.x < float(ROLEFORCESLENGTH)) {
        int type = int(floor(spr.x));
        #ifdef ISES300
            roleforce = roleforces[type];
            roleforceFix = roleforcesFix[type];
        #else
            for (int i=0; i < ROLEFORCESLENGTH; i++) {
                if (type == i) {
                    roleforce = roleforces[i];
                    roleforceFix = roleforcesFix[i];
                    break;
                }
            }
        #endif
    }

    float opart = fract(spr.x);                 // other particle
    float backbonedist;                         // backbone distance, 0..1 range
    if (part <= ACTIVERANGE) {
        backbonedist = abs(part - opart);
        if (backbonedist > ACTIVERANGE * maxBackboneDist && opart < ACTIVERANGE) return vec3(0);
        if (opart > ACTIVERANGE * maxActive && opart <= ACTIVERANGE) return vec3(0);
        if (opart < ACTIVERANGE * minActive) return vec3(0);
    } else {
        backbonedist = 99999.;
    }
    float lspringlen = spr.y * springlen + springlenfix;       // length of this spring
    //>> 17/12/2019 backboneScale and nonBackboneLen should NOT apply to these single springs
    //>> The spring generation code should allow for the equivalent if appropriate.
    //>> The horrid patch below is for York projects in progress ... TODO review and remove when a safe time comes
    //>> The offending line is commented out except for York case detected by window.CSynth.defs.fixedPoints
    ${CSynth.defs && window.CSynth.defs.fixedPoints ? '' : '// '} lspringlen *= min(backbonedist * VnumInstancesP2, nonBackboneLen) * backboneScale;  // <<<< WRONG
    float lspringforce = spr.z * (springforce * roleforce + roleforceFix);   // force of this spring
    float lspringpow = spr.w + springpow;       // power to apply to this spring

    lspringforce *= boost(part, opart);         // allow for boosting (if any)

    vec3 otherpos = poso(opart);             // others 'current' (previous) position

    vec3 dir = otherpos - mypos;                   // direction from mypos to other
    float len = length(dir);                    // length of spring
    if (len == 0.) return vec3(0.,0.,0.);       // no reliable direction
    float sforce = (len - lspringlen) * lspringforce * min(1000., pow(len/powBaseDist, lspringpow));
//    sforce *= pow(abs(len - lspringlen), springdiffpow);
//    if (spr.z == 0.) sforce *= pow(abs(len - lspringlen), springzeropow);
    sforce *= (backbonedist < INVPARTICLESP2 * 1.1) ? backboneStrength : 1.;

    float k = min(sforce / len, 0.5 / springrate);   // prevent overshoot, 0.5 in case the other end is shooting our way too

    return dir * k;                                 // dir/len is normalized direction
}  // spring

// compute effect of a pull to position style special spring
// for stability make sure it does not overshoot
// (better might be to try to work on integral of force of time interval)
// +ve spr.w allow transformation of position, -ve uses position as given
virtual vec3 pull(vec3 mypos, vec4 spr, float force, out vec3 tranpull) {
    vec3 pos = spr.xyz;
    vec3 ss = spr.w < 0. ? pos : (pullspringmat * vec4(pos - springCentre, 1) ).xyz + springCentre;
    tranpull = ss;
    float k = min(force * abs(spr.w), 1./springrate);
    return k * (ss - mypos);
}

#ifdef SMALLPAIRS
    #define pairforces pairforcessmall
#else
    #define pairforces pairforcesfull
#endif

vec3 pairforcessmall(vec3 mypos, float opart, in float olddensity, inout float density, in vec3 vel, inout float dirdensity) {
    float backbonedist = abs(part - opart);             // backbone distance (fractional)
    float backbonedistP = backbonedist * VnumInstancesP2;   // backbone distance (particles)
    vec4 other = poso4(opart);                          // full data for other particle
    if (isNaN(other.y + mypos.y)) return vec3(0);       // other is zombie, or I am (TODO factor me zombie at higher level)
    vec3 otherpos = other.xyz;                          // others 'current' (previous) position
    vec3 dir = otherpos - mypos;                        // direction from me to other
    float len = length(dir);                            // length from me to other
    if (len == 0.) return vec3(0.,0.,0.);               // overlap, can't even repulse as no direction
    float lforce = 0., gforce = 0., bforce = 0.;        // local, global and backbone forces to be accumulated

    // local pushapart, force is max at half way from pushapartuse 'edge' to centre, trailing to 0 at edge
    float pushapartuse = min(backbonedistP, nonBackboneLen)* backboneScale  + pushapartdelta;
    float dlen = len - pushapartuse;
    float rellen = len / pushapartuse;         // 1/2 at halfway (max force), 1 at edge (no force)
    float tlocalforce = pushapartlocalforce;
    float force = -tlocalforce * (1. - smoothstep(0.5, 1.0, rellen));
    return dir * (force / len);
}


// compute the effect of pushapart spring and other pairwise forces on me, and return force vector
// also compute local density of objects, and directional density (according to my direction)
vec3 pairforcesfull(vec3 mypos, float opart, in float olddensity, inout float density, in vec3 vel, inout float dirdensity) {
    // note, ACTIVERANGE already allowed for before calling pairforces

    // collect basic information used in several places
    float backbonedist = abs(part - opart);             // backbone distance (fractional)
    float backbonedistP = backbonedist * VnumInstancesP2;   // backbone distance (particles)
    vec4 other = poso4(opart);                          // full data for other particle
    if (isNaN(other.y + mypos.y)) return vec3(0);       // other is zombie, or I am (TODO factor me zombie at higher level)
    vec3 otherpos = other.xyz;                          // others 'current' (previous) position
    float otherdensity = other.w;                       // others 'current' (previous) density
    vec3 dir = otherpos - mypos;                        // direction from me to other
    float len = length(dir);                            // length from me to other
    if (len == 0.) return vec3(0.,0.,0.);               // overlap, can't even repulse as no direction
    float lforce = 0., gforce = 0., bforce = 0.;        // local, global and backbone forces to be accumulated
    bool sameRegion = (part-regionBoundary) * (opart-regionBoundary) > 0.;

    // density and directional density calculation (will be accumuated for this particle over all pair particles
    density += 1. / (len*len*len);              // accumulate density of neighbours
    float rvel = dot(dir, vel) / len;           // compute approach velocity
    rvel = max(0., rvel);
    dirdensity += rvel / len / len;             // compute a directdional density

    // local pushapart, force is max at half way from pushapartuse 'edge' to centre, trailing to 0 at edge
    float pushapartuse = min(backbonedistP, nonBackboneLen)* backboneScale  + pushapartdelta;
    if (!sameRegion) pushapartuse = nonRegionLen;

    float dlen = len - pushapartuse;
    float rellen = len / pushapartuse;         // 1/2 at halfway (max force), 1 at edge (no force)
    float tlocalforce = pushapartlocalforce;
    lforce += -tlocalforce * (1. - smoothstep(0.5, 1.0, rellen));

    gforce -= pushapartDensityFactor * olddensity * otherdensity * pow(len/powBaseDist, pushapartDensityPow);

    // global pushapart, don't push backbone neighbours apart
    if ((sameRegion && backbonedistP > 1.5) || ignoreBackbone != 0.)
        // gforce += -pushapartforce * pow(len/powBaseDist, pushapartpow);
        gforce += -pushapartforce * pow(max(len,backboneScale)/powBaseDist, pushapartpow);

    // fractal force
    // was set to gforce, but that gave issues with -999 special values 21/01/2022
    if (backbonedist < ACTIVERANGE * maxBackboneDist)
        bforce += fractforce * pow(backbonedistP, fractpow) * len;

    // main 'spring' force from xyz
    if (xyzforce != 0. && (backbonedist < ACTIVERANGE * maxBackboneDist)) {
        // float targlen = texture2D(distbuff, vec2(part, opart) * VnumInstancesP2 / VnumInstances).x;
        float targlen = texture2D(distbuff, vec2(part, opart) * SMALLTEXTURE).x;
        if (targlen < xyzMaxDist) {
            float dlen = len - targlen;
            gforce += dlen * xyzforce / pow(targlen, xyzpow);
        }
    }

    // extra backbone force to make regular backbone ... note, this will is be tailorable for multiple chromosomes etc
    // regular backbone forces defined in contactbuff or distbuff will still apply
    if (backboneforce != 0. && backbonedistP <= 1.5) { // backbone
        bforce += (len - backboneScale) * backboneforce;
    }

    // main 'spring' force from contacts
    if (contactforcesc != 0. && backbonedist < ACTIVERANGE * maxBackboneDist) {
        float contact = texture2D(contactbuff, vec2(part, opart) * SMALLTEXTURE).x;
        if (contact < -1000.) {     // probably -9898, chrom boundary,  but may not be exactly if using linear interpolation and expand
            bforce = 0.;  // means no boundary join, clear bforce and don't add to gforce
            // ??? should we cancel gforce ???
        } else {
            if (contact <= -9.) {  // probably == -999., but may not be exactly if using linear interpolation and expand
                gforce = 0.;
                if (backbonedistP <= patchwidth) contact = patchval;
                // else it will be set to 0 below ...
            }
            // replaced by < -1000 above if (contact == 0. && backbonedistP == 1.) bforce = 0.;  // 0 after patch really means no boundary join
            contact = max(0., contact - contactthreshold);
            gforce += contactforcesc * contact * len * boost(part, opart);
        }
    }

    /** / test contact force
    if (contactforce2 != 0. && backbonedist < ACTIVERANGE * maxBackboneDist) {
        float contact = texture2D(contactbuff, vec2(part, opart) * SMALLTEXTURE).x;
        contact = max(0., contact - contactthreshold);
        if (contact > 0.) {  // not needed ?
            float percent90 = 0.0006;
            gforce += contactforce2 * contact * (len - contactforce2len * pow(contact/percent90, contactforce2pow)) * boost(part, opart);
            // gforce += contactforce2 * contact * (len - contactforce2len*log(contact)) * boost(part, opart);
        }
    }
    /***/

    // Missouri Lorentzian model
    /*
    G.pushapartforce = G.contactforce = G.backboneforce = G.pushapartlocalforce = G.xyzforce = 0
    G.m_c = 20; G.m_alpha=1; G.m_force = 1; G.m_k = 10
    */
    // symbolic differentiation of the forumla from https://academic.oup.com/nar/article/45/3/1049/2605802
    // done by https://www.symbolab.com/solver/step-by-step/%5Cfrac%7Bd%7D%7Bdx%7D%5Cleft(c%5Ccdot%5Cfrac%7Bc%7D%7Bc%5Ccdot%20c%20%2B%20%5Cleft(x-d%5Cright)%5Ccdot%5Cleft(x-d%5Cright)%7D%5Cright)

    if (m_force != 0.) {
        // to decide, how much to share with contactforce path
        float contact = texture2D(contactbuff, vec2(part, opart) * SMALLTEXTURE).x;
        if (contact <= -9.) {  // probably == -999., but may not be if using linear interpolation and expand
            gforce = 0.;
            if (backbonedistP <= patchwidth) contact = patchval;
        }
        contact /= representativeContact;    // normalize, should not change shape, only scale
        if (backbonedistP < 1.5)        // their special case for |i-j| = 1
            contact = maxv/representativeContact;      // IFmax somewhat hard coded for now!
        if (contact > 0.) {
            float d = m_k * pow(contact, -m_alpha);     // target distance
            float dd = d - len;
            float dem = m_c * m_c + dd*dd;
            gforce += m_force * contact * -2. * m_c * m_c * dd / (dem*dem) * boost(part, opart);
        }
    }

    gforce *= pow(len/powBaseDist, springpow);
    float sforce = gforce + lforce + bforce;        // sforce is the strength of force (no direction)

    return dir * (sforce / len);                 // dir/len is normalized direction
} // end pairforces

// compute the effect of rod on me, and return new position of me
vec3 rod(vec3 mypos, vec4 rodd) {
    float opart = rodd.x;                           // other particle
    float lrodmin = rodd.y * springlen + springlenfix;             // min length of this rod
    float lrodmax = rodd.z * springlen + springlenfix;             // max length of this rod
    float damp = rodd.w;

    vec3 otherpos = poso(opart);                    // others 'current' (previous) position

    vec3 dir = otherpos - mypos;                    // direction from me to other
    float len = length(dir);                        // distance as now
    if (len == 0.) return mypos;                    // no reliable direction
    float lrodlen = clamp(len, lrodmin, lrodmax);   // length to achieve
    lrodlen = lrodlen * damp + len * (1. - damp);
    return otherpos - dir * (lrodlen / len);
}

void dospringset(sampler2D tbuff, vec3 old, inout vec3 force) {
    // other masses
    for (float i=spstart; i < spend; i +=spstep) {        // iterate over springs; ? break loop on first NOSPRING ?
        vec4 spr = texture2D(tbuff, vec2(i, part));
        if (spr.x != NOSPRING) {
            force += spring(old, spr);
        }
    }
}

vec3 randvec3(float p) { return (vec3(fract(p*1379.3), fract(p*1795.3), fract(p*1994.3)) - 0.5) * randvecscale; }

virtual vec3 finalFixPos(vec3 v) {
    return v;
}


/// Fragment shader entry.
void main() {

    //float partn = part * VnumInstancesP2 - 0.5;  // partn ranges from 0..VnumInstancesP2-1
    currt = workhisttime;                   // 'current' time = last time for which values recorded
    float pprevt = fract(1. + currt - 1./WORKHISTLEN);  // previous time, use to establish velocity, nb repeat wrap was sometimes wrong

    vec4 old4 = poso4(part);
    vec3 old = old4.xyz;        // my 'current' position
    float olddensity = old4.w;  // my 'current' density

    // accumulate force for this mass,
    vec3 force = vec3(0);

    // establish previous velocity
    vec3 prev = posot(part, pprevt);     // my previous position for velocity
    vec3 velold = (old - prev)/springrate;  // compute velocity from last frame, so large forces are damped

    dospringset(topologybuff, old, force);
    #define NOTRANPULL NOSPRING
        vec3 tranpull = vec3(NOTRANPULL);  // initial value, set as OUT parameter by pull() calls below
    /** 'normal' pull force using spechial pullspring (if defined) for particle */
    if (pullspringforce != 0. || pullfixdamp != 0.) {
        vec4 spr = texture2D(topologybuff, vec2(pullpos, part));
        if (spr.w != NOTRANPULL)
            force += pull(old, spr, pullspringforce, tranpull);
    }
    /** pull to skeleton, eg for tadpole to track horn skeletons  */
    if (pullskelforce != 0.) {
        int partn = int(floor(part * VnumInstancesP2));
        vec4 auto = texelFetch(scaleDampTarget, ivec2(0,0), 0);
        vec4 spr;
        spr.xyz = texelFetch(pullskelbuff, ivec2((partn % pullskelwidth), partn / pullskelwidth), 0).xyz;
        spr.xyz = (spr.xyz - auto.xyz) * auto.w * pullskelscale + springCentre;
        spr.w = 1.; // force +ve for transform
        force += pull(old, spr, pullskelforce, tranpull);
    }
#define noPUSHPAIRS        // define PUSHPAIRS to do full pairwise check: now checkbox
#define noPUSHRAND 1000. // define PUSHRAND to do PUSHRAND pseodo-random pairwise checks


    float density = 0.;
    float dirdensity = 0.;

#ifdef PUSHPAIRS
    // pushapart for all pairs
    // we need to arrange this so pushapart works on a pseudo-particle but not back
    // but contact/xyz etc forces do not attempt to do so.
    if (part <= ACTIVERANGE) {
        #if VARY != 0
            //? w.i.p. towards no shader recompile for changed sizes
            float ii = INVPARTICLESP2 * 0.5;
            for (int iii=0; iii<17000; iii++) {
                if (ii >= ACTIVERANGE) break;
        #else
            for (float ii = INVPARTICLESP2 * 0.5; ii < ACTIVERANGE; ii += INVPARTICLESP2) {
        #endif
            if (ii > ACTIVERANGE * maxActive) break;
            if (ii < ACTIVERANGE * minActive) continue;
            //if (contactforce == 0. && (ii == part-INVPARTICLESP2 || ii == part+INVPARTICLESP2)) {} else // do not handle backbone as pairs for old style forces, do for contactforce
            {
                // vec4 papart = vec4(ii, 9999 /*not used */, pushapartforce, pushapartpow);  // new pushapart spring, NOT compensated  by INVPARTICLESP2
                force += pairforces(old, ii, olddensity, density, velold, dirdensity);
            }
            #if VARY != 0
                ii += INVPARTICLESP2;
            #endif
        }
    }
#endif

    if (gradforce != 0.) {
        vec3 ipos = floor(((vec4(old,1) * gradtran).xyz - gradlow) / (gradhigh - gradlow) * gradnum);  // should give integer triple in 0..gxnum etc
        float yz = floor(ipos.y / gradysplit.x);
        float yx = mod(ipos.y, gradysplit.x);
        vec2 lpos = vec2(
            (ipos.x + yx * gradnum.x + 0.5) / (gradnum.x * gradysplit.x),
            (yz + ipos.z * gradysplit.y + 0.5) / (gradysplit.y * gradnum.z)
        );

// lpos = vec2((ipos.x+0.5) / gradnum.x, (ipos.y + ipos.z * gradnum.y + 0.5) / (gradnum.y * gradnum.z));

        force += gradforce * texture2D(gradField, lpos).xyz;
    }

    // viscocity
    if (visc != 0.) {
        vec3 velnew = velold * damp + force;     // tentative new velocity
        vec3 velavg = (velnew + velold) * 0.5;  // average vel over timestep
        velavg = velold;
        float ll = dot(velavg, velavg);
        float llp = pow(ll, viscpow * 0.5 - 0.5); // 0.5 as ll is square, -1 as velavg still has length
        force -= visc * velavg * llp;
    }


    force += customForce(old);
    float tt = time + part;
    if (fract(42.1 * tt) < noiseprob)
        force += (fract(vec3( 17.9 * tt, 19.2 * tt, 11.3 * tt)) - 0.5) * noiseforce;

    if (noisefieldforce != 0.) {
        float partn = floor(part * VnumInstancesP2);
        //if (mod(partn, noisefieldmod) == 0.)
        //    force += noisefieldforce * noisefield((old + vec3(part * noisefieldpartfac, sin(time * noisefieldtimefac), 0)) / noisefieldscale, 0.00001);
        if (mod(partn, noisefieldmod) == 0.)
            force += noisefieldforce * noisefield(vec4( (old + vec3(part * noisefieldpartfac, 0, 0)) / noisefieldscale, time * noisefieldtimefac));
    }


    // allow for my damped velocity
    float use = damp;                                  // proportion of vel to use, allowing for damping
#define damptype ${setspringshaders.damptype}
#if damptype == 1                                   // for exponential damping, e.g. G.damp = 0.9
    use = damp;

#elif damptype == 2                                 // for 4th power damping direct, e.g. G.damp = 500000
                                                // does not allow for change of v over time step
    float velsq = dot(velold, velold);
    use = max(0., 1. - damp * velsq * velsq);   // max to allow for 'overshoot' of v**4

#elif damptype == 3                                 // for 4th power damping using v = t**(-1/3), e.g. G.damp = 10000
                                                // should give correct value for end of time step
                                                // leaves slight vibration
    float v = length(velold);
    v = max(0.00000000000001, v);
    float t = pow(v, -3.);
    use = pow((t + damp), -1./3.) / v;

#elif damptype == 4                                 // for 4th power damping using v = t**(-1/3), e.g. G.damp = 0.5
                                                // may ??? be equivalent to type==3 with adjusted G.damp
                                                // less vibration, very sensitive for G.damp > 0.95
//    float v = length(velold) * density * 0.2;   // (1. * 0.1 * density);
    float v = length(velold) * (1. + dirdensity); // exaggerate vel by dirdensity to really dampen crash situations (less bounce)
    v = max(0.00000000000001, v);
    float t = pow(v * damp, -3.);
    use = pow((t + 1.), -1./3.) / v;
use = clamp(use, 0., 1.);

#elif damptype == 599                               // for 4th power damping direct, doesnt work well but we might want to tweak it
    float ll = length(velold);
    float ll3 = ll * ll * ll;
    velold -= damp * velold * ll3;                  // 4th power force
    use = 1.;

#endif

    #if ${torsionSprings.use ? '1==1' : '1==0'}
    if (backbonetorsionspringforce != 0. || backbonetorsionspringconst != 0.) {
        force += autotorsion();
    }
    #endif

    if (modelSphereForce > 0.) {
        float xdist = length(old) - modelSphereRadius;
        if (xdist > 0.)
            force -= modelSphereForce * normalize(old) * xdist;
    }

    if (damp < 0.) use = -damp;  // partly for debug, force damp value


    // soft clipped maximum force
    // if (ff > springmaxforce) force *= springmaxforce / ff;
    //float rr = length(force) / springmaxforce;
    //force *= soft(rr);

    // compare old and new velocities to prevent bi-stable
    // TODO: make this less binary, and maybe even incorporate with damp
    // With or without soft() does not make too much differences.
    // It helps allowing G.xyzforce=0.2 rather than G.xyzforce=0.1,
    // but that help is not enough to be really useful.
    /****
    float sold = length(velold);        // strength of old velocity
    vec3 dirold = velold / sold;        // direction of old velocity
    float scomp = dot(force, dirold);   // scalar component of new (force) in direction of old
    vec3 vcomp = dirold * scomp;        // vector component of new (force) in direction of old
    vec3 orth = force - vcomp;          // vector component of new orthogonal to old
    if (scomp < 0.) {                   // direction change
        float smax = sold * 0.5;        // max vec we will allow for new
        if (-scomp > smax)              // hard limit at smax
            force = orth + - dirold * smax;

        //float u = soft(scomp / smax);   // how much of max can we use, soft limit at smax
        //    force = orth + - dirold * u * smax;

    }
    ***/

// force = vec3(0);

    // establish new velocity
    vec3 vel = velold * use + force;
    vel += vec3(0, -gravity, 0.);
    // vel *= springrate;
    // vel = clamp(vel, -0.1, 0.1);

    // soft clipped maximum velocity
    float rr = length(vel) / springmaxvel;
    vel *= soft(rr);
    if (isNaN(vel)) vel = vec3(0); // velold;

    vec3 mypos = old + vel*springrate;        // my new position

    // improve stability in bistable case, 19/10/2020, especially for tad virus?
    // changed from velold->vel 31 Mar 2021, with velold was making CSynth/Lorenz LESS stable
    // This is over the top damping, generally a moving particle will have drag force against it ????
    if (dot(vel, force) < 0.) mypos =  (old + mypos) * 0.5;

    // enforce rod if any
    vec4 rodd = texture2D(topologybuff, vec2(rodpos, part));
    if (rodd.x != NOSPRING && rodd.w >= 0.)   // x!= NOSPRING rod exists, w>0 rod enabled
        mypos = rod(mypos, rodd);

    if (part > maxActive * ACTIVERANGE && part <= ACTIVERANGE) {
        vec3 a = poso(maxActive * ACTIVERANGE - INVPARTICLESP2);
        vec3 b = poso(maxActive * ACTIVERANGE);
        mypos = a + (b-a) * (part - maxActive * ACTIVERANGE + INVPARTICLESP2) + randvec3(part);
    }

    if (part < minActive * ACTIVERANGE) {
        vec3 a = poso(minActive * ACTIVERANGE + INVPARTICLESP2);
        vec3 b = poso(minActive * ACTIVERANGE);
        mypos = a + (b-a) * (part - minActive * ACTIVERANGE + INVPARTICLESP2) + randvec3(part);
    }

    if (isNaN(mypos)) mypos = old + normalize(vel)*springrate;

    // apply centre and continuous spring rotation, BEFORE fix so fix still really fixes
    mypos = mix(springCentre, mypos, springCentreDamp);
    // mypos = (vec4(mypos,1) * springRotate).xyz;

    // enforce fix if any  NOTE, should be able to combine rod and fix into single lookup
    // we intentionally allow fix to set NaN
    vec4 fixd = texture2D(topologybuff, vec2(fixpos, part));
    if (fixd.x != NOSPRING)
        mypos = fixd.yzw;

    if (pullfixdamp != 0. && tranpull.x != NOTRANPULL)
        mypos = pullfixdamp * tranpull + (1. - pullfixdamp) * mypos;

    mypos = finalFixPos(mypos);


	gl_FragColor = vec4(mypos,density);
}
`

    getdata["shaders/springs.vs"] = vert;
    getdata["shaders/springs.fs"] = frag;
    return [vert, frag];

} // setspringshaders

setspringshaders.damptype = 4;
//setspringshaders();

/* springpow notes:
applies to 'independent' springs (spring())
applies to gforce (NOT lforce, bforce)
    pushapartDensityFactor (pushapartDensityPow)
    pushapartforce (pushapartpow)
    xyzforce (xyzpow)
    contactforce (no contactpow)
    m_force (m_alpha etc)  Lorentz


*/
/* viscosity
v' = g-k*v
c is initial velocity v0

e = Math.E
ln = Math.log
v = (f,k,c, x=1) => (f + e**(k*(ln(c*k-f)/k - x)))/k
// old dd = (f,k,c, x=1) => (f*x - e**(k*(c-x))/k ) / k + c
// export dd = (f,k,c, x=1) => (e^(-k*q)*((f*k*q+c*k-f)*e^(k*q)-c*k+f))/k^2
dd = (f,k,c, q=1) => (e**(-k*q)*((f*k*q+c*k-f)*e**(k*q)-c*k+f))/k**2

v from
https://www.emathhelp.net/calculators/differential-equations/differential-equation-calculator/?i=y%27%28x%29+%3D+f+-+k*y%2C+y%280%29%3Dc
y'(x) = f - k*y, y(0)=c

dd from https://www.integral-calculator.com/
(f + e**(k*(ln(c*k-f)/k - x)))/k
*/
