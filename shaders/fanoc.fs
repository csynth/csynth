
/*
code created with help from https://code.google.com/p/rtrt-on-gpu/source/browse/trunk/Source/GLSL+Tutorial/Implicit+Surfaces/Fragment.glsl?r=303
 */
// #define USEOPT   // undeine this to revisit the almost obsolete optimized version which does not respect rot4
float eval(vec3 pointa);
#include implicit.fs;

gene(b000,  0, -10, 10, 5, 0.01, geom, free) ///
gene(b100,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b010,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b001,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b110,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b101,  10, -10, 10, 5, 0.01, geom, free) ///
gene(b011,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b210,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b120,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b201,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b102,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b021,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b012,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b111,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b300,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b030,  10, -10, 10, 5, 0.01, geom, free) ///
gene(b003,  10, -10, 10, 5, 0.01, geom, free) ///
gene(b200,  1, -10, 10, 5, 0.01, geom, free) ///
gene(b020,  10, -10, 10, 5, 0.01, geom, free) ///
gene(b002,  10, -10, 10, 5, 0.01, geom, free) ///



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Compute implicit function value and normal in specific point

float eval(vec3 pointa) {
	vec4 point = vec4(pointa, 1.0); //

	float X = point.x;
	float Y = point.y;
	float Z = point.z;
	float W = point.w;
	
	float r = 0.;
	r += b000 * W * W * W;
	r += b001 * Z * W * W;
	r += b002 * Z * Z * W;
	r += b003 * Z * Z * Z;

	r += b010 * Y * W * W;
	r += b011 * Y * Z * W;
	r += b012 * Y * Z * Z;

	r += b020 * Y * Y * W;
	r += b021 * Y * Y * Z;

	r += b030 * Y * Y * Y;

	r += b100 * X * W * W;
	r += b101 * X * Z * W;
	r += b102 * X * Z * Z;

	r += b110 * X * Y * W;
	r += b111 * X * Y * Z;

	r += b120 * X * Y * Y;

	r += b200 * X * X * W;
	r += b201 * X * X * Z;

	r += b210 * X * X * Y;

	r += b300 * X * X * X;

	return r;
}

// Evaluation can be done in one of two ways.
// 1: single computation
// eval(p) evaluates field at p, and allows for rotation
// This must be used for computation of grad, and where USEOPT is not set
//
// 2: prep followed by fast computation
// opt=prepopt(p) computes a cubic in p.z given fixed values for p.x and p.y
// evalopt(opt,p) uses p.z in the cubic c to compute the field
// This can provide much faster search of main ray where USEOPT is set,
// but in this case rot4 is disabled
//
// To simplify code in the main search, we assume standard eval (as above)
// and where USEOPT is set we define preopt and evalopt
//
// Notes added 24/03/2017
// rot4 is now applied to the ray before it is cast, so is not needed 
// The optimization (2) above has some mathematical interest, 
// but turns out not the be generalizable to other fano varieties
// and so is of little but historic interest (if even that).
// 
#ifndef USEOPT    // usual case
#else  // ~~~~~~~~~~~~~~~~~~~~~~~~ all code below here used with almost dead USEOPT case only
#define prepopt prepoptfano
#define evalopt evaloptfano
#define optT vec4

// prepopt given x and y to find cubic in z,
// coefficients of the cubic c held in a vec4, so c.x + c.y*z + c.z*z*z + c.w*z*z*z (a + b*z + c*z*z + d*z*z*z)
vec4 prepoptfano(vec2 point) {
	vec4 r = vec4(0.,0.,0.,0.);
	
//	float X = (A *(point.x - al));
//	float Y = (B *(point.y - be));
//	float Z = 1.; // (C *(point.z - ga));
//	float b300 = 1., b030 = 1., b003 = 1.;
//	float b200 = 1., b020 = 1., b002 = 1.;

	float X = point.x;
	float Y = point.y;
	float Z = 1.;
	float W = 1.;

	
	r.x += b000 * W * W * W;
	r.y += b001 * W * W * Z;
	r.z += b002 * W * Z * Z;
	r.w += b003 * Z * Z * Z;

	r.x += b010 * W * W * Y;
	r.y += b011 * W * Y * Z;
	r.z += b012 * Y * Z * Z;

	r.x += b020 * W * Y * Y;
	r.y += b021 * Y * Y * Z;

	r.x += b030 * Y * Y * Y;

	r.x += b100 * W * W * X;
	r.y += b101 * W * X * Z;
	r.z += b102 * X * Z * Z;
	r.x += b110 * X * Y;
	r.y += b111 * X * Y * Z;

	r.x += b120 * X * Y * Y;

	r.x += b200 * W * X * X;
	r.y += b201 * X * X * Z;

	r.x += b210 * X * X * Y;

	r.x += b300 * X * X * X;
	
	return r;
}

/** evalopt performs a fast evaluation of field at a point,
using the cubic c precomputed for p.x and p.y, and using p.z for z in the cubic */
float evaloptfano(vec4 c, vec3 p) {
	float z = p.z; 
	return c.x + c.y*z + c.z*z*z + c.w*z*z*z;
}
#endif

