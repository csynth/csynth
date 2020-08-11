/******************************************************************************************
This performs a raytrace search for front face of an implicit equation (defined in eval).
The vertex shader passes unchanged points, so this fragment shader is called once for each point on the screen.
Note that as z is only computed during the fragment shader, it is not saved in the depth buffer for mixing with other renderings.

It requires several support functions:
eval:               float eval(vec3 point)  evaluate function at point (typically from fano.fs)
iridescentTexcol:                           colour a point once found (typically from texture.fs)

Optionally we can use optimization functions, via macros to enable this code to detect if they are present
This performs the optimization for each point, but can then evaluate the function faster in the repeated evaulation calls during search
prepopt:  T eval(vec2 pointa)              optimization for point on screen, typically no-op, but see fano.fs
evalopt:  float evalopt(T opt, vec3 point) evaluate function at point, given optimization hint


******************************************************************************************/
#define IMPLICIT
#include common.vfs;

/******************************************************************************************/
/**** first some generic stuff to fit into organic environment */
uniform mat4 rot4;  // rotation part of viewing transform
uniform mat4 rot44d;  // 4d viewing transform
uniform mat4 camInvProjMat;  // inverse camera projection etc
uniform mat4 camMatrixWorld; // camera Matrix World, not inverse, but what we need
uniform mat4 invrot4;  // inverse rot4
// uniform vec2 rtSize;


uniform float appTime;
uniform sampler2D colbuff;		// sampler used to hold colours
float xhornid = 0.;
float colourid = 1.;
#define ribs 10.

vec4 xcol = vec4(0.,0.,0.,0.);  // extra colour applied by horn code or ...
#define opos vec4(0.,0.,0.,1.)  // not really used, but texture likes it
#include texture.fs;
float reflnorm = 1.;            // keep track of reflections so normals can be corrected
#include lights.fs;
/******************************************************************************************/

// controls to make variant versions of shader for experiment
// single quotes round normal gave very mad glsl compiler errors, even when ifdefed out
#ifndef prepopt
    #define prepopt(p) false                    // dummy
    #define evalopt(opt,p) eval(p)              // evaluate directly with no prepopt
    #define optT bool                           // dummy
#endif

#define INTERVALS 500  // fixed to help compilers
#define CHOPS 7

gene(showtype,  0, -1,1, 1, 1, display, frozen) // -1 or 1 to show as solid (positive or negative), or 0 to show as two-sided surface
gene(rim,  0.02, 0,0.1, u, 0.005, display, frozen) // adjust the width of the border rim
gene(curvycol,  0.2, 0, 10, u, 0.01, display, frozen) // adjust the scale of red tinting at high curvature
gene(viewRad,  1.0, 0, 100, u, 0.01, display, frozen) // radius for view, 1000 for full
gene(steprange,  5, 1, 10, u, 0.1, impl, frozen) // internal: should not change object. Adust level of dynamic stepsize in raycast.
gene(intervals,  50, 1, 500, u, 1, impl, frozen) // internal: adjust the number of intervals actually used
gene(STEP,  0.01, 0, 1, 0.001, 0.001, impl, frozen) // internal: adjust the step used for finding grad/normal

gene(raystartd, 0, 0,1000, 1,1, system, frozen)   // start distance of perspective ray
gene(rayendd, 2, 0,1000, 1,1, system, frozen)   // end distance of perspective ray
gene(perspective, 0, 0,1, 1,1, system, frozen)   // set to non=0 for perspective
gene(raysizer, 800, 0,1000, 1,1, system, frozen)   // scale sizing for raytrace

//-----------------------------------------------------------------------------

// compute grad of a point, also compute second partial derivative d2f as side-effect
vec3 grad(in vec3 point, out vec3 d2f) {
    /* We calculate normal by numerical estimation of a gradient */
	float step = STEP;
	float v = eval(point);
	vec3 vl, vh;
	vl.x = eval(point - AxisX * step);
	vh.x = eval(point + AxisX * step);
	vl.y = eval(point - AxisY * step);
	vh.y = eval(point + AxisY * step);
	vl.z = eval(point - AxisZ * step);
	vh.z = eval(point + AxisZ * step);

	vec3 vv = vec3(v,v,v);
	vec3 grad = (vh - vl) / step;
	d2f = (vl + vh - 2.*vv) / step / step;
    return grad;
}


//-----------------------------------------------------------------------------

/**
 * Intersects ray with implicit surface.
 * Use a two phase approach.
 * castRayApprox advances forwards in INTERVALS steps until we find a zero crossing.
 * castRayRefine then homes in on the zero crossing with a binary chop.
 *
 * The forward advance in castRayApprox uses extrapolation to create dynamic step sizes,
 * which improves the chance of finding a grazing crossing.  (otherwise sawtooth effect)
 * This means more work in each loop interaction, but many fewer iterations are needed.
 * The home in uses direct binary chop, as both more complex chop and quadratic solutions proved unstable.
 */
bool castRayApprox(	optT opt   /* prepared cubic */,
			in vec3 raystart, vec3 raydir      /* ray raystart and raydir */,
			in float start   /* ot when a ray enters a box */,
			in float final   /* ot when a ray leaves a box */,
			out float Rot    /* ot of ray-surface hit */,
			out float Ror    /* ot of ray-surface hit */,
			out float Rt    /* ot of ray-surface hit */,
			out float Rr    /* ot of ray-surface hit */
			) {

    //float step = (final - start)/ float(INTERVALS);
	//float stepmin = step / steprange;
	//float stepmax = step * steprange;
	int iintervals = int(intervals);
    float ot = start;
	float t = start;
	vec3 startpoint = raystart + ot * raydir;

    //----------------------------------------------------------
    float r;
	float or = evalopt(opt, startpoint);	// usually = eval(startpoint)
	if (showtype != 0. && or * showtype > 0.) { Rt = Rot = start; return true; }
	float dz = 0.;  // estimated distance to zero point for dynamic steps

    //----------------------------------------------------------
    for (int i = 0; i < INTERVALS; ++i) {
		if (i >= iintervals) return false;
		//float step = (final - start)/ float(intervals);
		float step = (final - t)/ float(iintervals - i);
		float stepmin = step / steprange;
		float stepmax = step * steprange;
		float dstep = dz;
		dstep = dstep < 0. ? step : clamp(dstep, stepmin, stepmax);
		if (i == iintervals-1) dstep = final - t;
		if (t + dstep > final) dstep = t - final;
		t += dstep;

        r = evalopt(opt, raystart + t * raydir);  // usually = eval(startpoint)
        dz = r * dstep /(or - r);  // current estimate of 0 crossing, relative to t
        if (or * r < 0.0) {  // return rough result
			Rot = ot; Ror = or; Rt = t; Rr = r;
			return true;
        }
		//t = min(t, final);
        or = r;
		ot = t;
    }
    return false;
}


bool castRayRefine(	optT opt   /* prepared cubic */,
			in vec3 raystart, vec3 raydir      /* ray raystart and raydir */,
			in float start   /* ot when a ray enters a box */,
			in float final   /* ot when a ray leaves a box */,
			in float oot    /* ot of ray-surface hit */,
			in float oor    /* ot of ray-surface hit */,
			in float ot    /* ot of ray-surface hit */,
			in float or    /* ot of ray-surface hit */,
			out float Rt    /* ot of ray-surface hit */) {

	float t, r;
	// the homing in loop will do a binary chop with boundaries ot->or and oot->oor
	// using linear interpolation can cause problems with some functions
	// binary chop may take a step or so extera but is stable

	// Bug in compiler ??? When this called castRayApprox as subroutine
	// having a loop here gave wrong answer (?Rt = start?)
	// So broken out to have castRayApprox and castRayRefine called sequentially from higher level.
	// Worked in raystartal when castRayRefine code was actually embedded in castRayApprox.
	//
	for (int ii = 0; ii < CHOPS; ii++) {
		t = (oot+ot)/2.;
		r = evalopt(opt, raystart + t * raydir);  // only used for sign,  usually = eval(startpoint)
		if (r*or < 0.0) {  // t->r and ot->or are opposite, forget oot
			oot = t; oor = r;
		} else {         // t->r and oot->oor are opposite, forget ot
			ot = t;	or = r;
		}
	}


	Rt = t;
	//Rt = (start + final) / 2.;
	return true;

	}

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Core ray tracing function

This orchestrates a raytrace with the combined castRayApprox/castRayRefine method,
and then colours the resulting hit (if any) using iridescentTexcol
Result is the final colour.  (Todo, separate raytrace and colour part)
***********************************************************************/
vec3 Raytrace(vec3 raystart, vec3 raydir, float start, float final) {
	// float t = 0.;
	{
		float oot, oor, ot, or, t=0., r;
		vec3 startpoint = raystart + start * raydir;
		optT opt = prepopt(startpoint.xy);  // for optimized fanoc only, extract the cubic, usually a no-op
		if (castRayApprox(opt, raystart, raydir, start, final, ot, or, oot, oor)) {
			if (oot == start)
				t = start;
			else
				castRayRefine(opt, raystart, raydir, start, final, ot, or, oot, oor, t);

			vec3 point = raystart + raydir * t;
			vec3 d2f;
			vec3 gr = grad(point, d2f);
			vec3 normal = normalize(gr);
			vec3 curv = cross(d2f, normal);

			// float l = clamp(length(gr) / length(point) * 0.2, 0., 1.);
			float l = length(curv) / length(gr) * curvycol;
			vec3 color = vec3(l, 0.7, 1.0);
			// the surface is double-sided, make sure we use normal towards the eye
			if (dot(normal, raydir) > 0.) {
				normal = -normal;
				color = vec3(l, 1.0, 0.0);
				// pending setup in js colourid = 2.;  // WALLID
			}
			vec4 rpoint = (vec4(point, 1.));
#ifdef RAND
			Colsurf texcol = iridescentTexcol(rpoint.xyz * 100., raydir, normal ); // standardTexcol(rpoint * 100.);
			texcol.col.xyz *= color;
			normal = bump(rpoint.xyz, normal);
#else
			Colsurf texcol = colsurf(vec4(color.r, color.g, color.b, 1.), shininess1gloss1subband1plastic1, fluorescH1fluorescS1fluorescV1iridescence1);
#endif
			//if (1. - rim*0.5 < length(rpoint) && length(rpoint) < 1. + rim*0.5) color = vec3(1.0, 0., 0.);  // original size
			//if (0.2 < abs(rpoint.x) && abs(rpoint.x) < 0.3) color = vec3(0., 1., 0.);  // axis stripes
			if (perspective == 0.)
				if (length(point) > viewRad*(1. - rim)) texcol.col.xyz = vec3(1.0, 0., 0.);      // rim
			if (t == start) { normal = normalize(point); texcol.col.xyz = Unit; }  // solid wrapper for showtype

		    CookieVis visibilityL;// = vec3(1.,1.,1.);
    		visibilityL.L0 = visibilityL.L1 = visibilityL.L2 = vec4(1.);

			return Phong(rpoint, AxisZ, normal, texcol, visibilityL);  // no shadows so visibility always 1
		} else {
            //discard;  // discarding at this level broke in ?ANGLE?, presumeably too divergent ???
            return(vec3(-1.,-1.,-1.));
        }
	}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Shader entry point
void main() {
	vec2 raystartxy = 2. * (gl_FragCoord.xy / rtSize - 0.5) ;  // -1 .. 1
    vec4 raystart = vec4(raystartxy.xy*(viewRad >= 999. ? 1. : viewRad), 0, 1);
	vec3 raydir = -AxisZ;
	float start, final;
	#ifndef USEOPT
	if (perspective != 0.) {
		// set up ray using rot4, does not work in USEOPT optimized fanoc case

		mat4 mm = camInvProjMat;
		//mm = mm * modelViewMatrix;

		raystart = vec4(0,0,0,1);
		raydir = (camInvProjMat * vec4(raystartxy, 1, 1)).xyz;
		// raystart /= raystart.w;

		raystart = camMatrixWorld * raystart;
		raydir = mat3(camMatrixWorld) * raydir;

		raystart = raystart * invrot4;
		raydir	= raydir * mat3(invrot4);

		raystart /= raysizer;  // put into approximately 'standard' size
		raydir = normalize(raydir);
		start = raystartd;
		final = rayendd;
	} else {
		raystart = raystart * invrot4;
		raydir	= -AxisZ * mat3(invrot4);
		//raystart = rot4 * raystart;
		//raydir = mat3(rot4) * raydir;

		float len = length(raystartxy.xy*viewRad);
		if (len > viewRad && viewRad < 999.) discard;
		start = (viewRad >= 999.) ? -1. : -sqrt(viewRad*viewRad-len*len);
		final = -start;
	}

	#endif
	vec3 hit = Raytrace(raystart.xyz, raydir, start, final);
	if (hit.x == -1.)discard;   // in some cases we can do this at the Raytrace level, but not for all environments
	gl_FragColor = sqrt(vec4(hit , 1.0));
	//gl_FragColor = vec4(raystartxy.x,raystartxy.y,0.,1.);
}
