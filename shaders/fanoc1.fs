// controls to make variant versions of shader for experiment
// This version implements the more complex '3d' version of Fano, with a different variety
float eval(vec3 pointa);
#include implicit.fs;

#define xp2 (x*x)
#define yp2 (y*y)
#define zp2 (z*z)
#define wp2 (w*w)
#define wp3 (w*w*w)
#define wp4 (w*w*w*w)
#define f1p2 (f1*f1)

// #define RAD 5.0

/**
Set p1=6.076
             A     B    C   D    E F   G H    I
Set f1 = z*(x^2 - x*y+ y^2- p1)+(1-z)*(x-x*y+y^2)
           J   K          L     M     N O   P  Q   R
Set f2 = (3*x-4*y)*(f1^2-z*f1+2*z^2)+(1-x)*(3-f1*z+z^2)
Then the slice is f2=0.

One can include some, but far from all, parameters of this Fano by setting:

f1 = z*(A*x^2+ B*x*y+ C*y^2 -D)+(E+ F*z)*(G*x+ H*x*y+ I*y^2)
f2 = (J*x+K*y)*(f1^2+L*z*f1+M*z^2)+(N-O*x)*(P+Q*f1*z+R*z^2)
**/

gene(A,  1, -10, 10, 5, 0.01, geom, free) ///
gene(B,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(C,  1, -10, 10, 5, 0.01, geom, free) ///
gene(D,  -6.076, -10, 10, 5, 0.01, geom, free) ///  p1
gene(E,  1, -10, 10, 5, 0.01, geom, free) ///
gene(F,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(G,  1, -10, 10, 5, 0.01, geom, free) ///
gene(H,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(I,  1, -10, 10, 5, 0.01, geom, free) ///
gene(J,  3, -10, 10, 5, 0.01, geom, free) ///
gene(K,  -4, -10, 10, 5, 0.01, geom, free) ///
gene(L,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(M,  2, -10, 10, 5, 0.01, geom, free) ///
gene(N,  1, -10, 10, 5, 0.01, geom, free) ///
gene(O,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(P,  3, -10, 10, 5, 0.01, geom, free) ///
gene(Q,  -1, -10, 10, 5, 0.01, geom, free) ///
gene(R,  1, -10, 10, 5, 0.01, geom, free) ///
//geneNOT(usew, 0, 0,1,  1,1, geom, fixed) /// set to 1 to use w in equation
#define usew 1.

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Compute implicit function value and normal in specific point


float eval(vec3 pointa) {
	float wneg = 1.;
	vec4 point = vec4(pointa, 1.0) ;
	//if (abs(point.w) < 0.0001) return 0.;
	if (usew == 0.) {
		wneg = point.w < 0. ? -1. : 1.;
		point = point / (point.w);
	}

	float x = point.x;
	float y = point.y;
	float z = point.z;
	float w = point.w;
	//float r = 0.;
	float f1, f2, f2a;
	if (usew == 0.) {
		f1 = z*( A*x^2 + B*x*y + C*y^2 + D)+( E + F*z)*( G*x + H*x*y + I*y^2);
		f2 = (J*x + K*y)*(f1^2 + L*z*f1 + M*z^2)+(N + O*x)*(P + Q*f1*z + R*z^2);
		//f2 = f2a * wneg;  // << use of wneg in here breaks glsl
	} else {
		f1 = z*( A*x^2 + B*x*y + C*y^2 + D*w^2)+( E*w + F*z)*( G*x*w + H*x*y + I*y^2);  // degree 3
		f2 = (J*x + K*y)*(f1^2 + L*z*f1*w^2 + M*z^2*w^4)+(N*w + O*x)*(P*w^4 + Q*f1*z + R*z^2*w^2)*w^2;     // degree 7
	}
	return f2*wneg;
}

