#ifndef FOURSHADOWMAPPING
#define FOURSHADOWMAPPING

precision highp float;

// gene for shadow strength -- default at 0 (max)
gene(shadowstrength, 0.0, 0.0, 1.0,   0.1, 0.01, shadows, frozen)   // strenght of light when in shadow (1 => no shadow)
gene(wall_shadowstrength, 0.0, 0.0, 1.0,   0.1, 0.01, shadows, frozen)   // strenght of light when in shadow, for wall (1 => no shadow)
//ge ne(shadowdepthoff, 0.0005, 0.0, 0.001, 0.0001, 0.0001, shadows, frozen)  // depth offset used to prevent false shadows
gene(shadowdepthoffZ, 10, 0.0, 20, 1, 1, shadows, frozen)  // depth offset used to prevent false shadows (with full Z depth)
// gene for shadow sharpness -- default at 2
//gene(shadowsharp, 2.0, 0.0, 5.0, u, 0.01, shadows, frozen)

//gene(shadowuses, 1.0, 0.0, 1.0,   0.1, 0.01, shadows, frozen)   // use of S curve, 0 = linear, 1 = S curve)


//gene(shadow Offset, 0, -0.1, 0.1, 0.01, 0.001, shadows, frozen)
/// Uniform variables.
uniform sampler2D depthTexture0;
uniform sampler2D depthTexture1;
uniform sampler2D depthTexture2;
/// Varying variables.
//varying vec4  vPosition;

// can be set as a uniform, used for PCF
uniform float textureResolution;
//#define TEX_RESOLUTION float(textureSize2D(depthTexture0, 0)) // needs webgl2 #extension GL_EXT_gpu_shader4 : enable
#define TEX_RESOLUTION textureResolution
#define SHADOWTYPE $$$shadowType$$

/* get shadow depth, ?with offset in case of self-shadowing*/
float sdepth(const vec2 pos, const sampler2D depthTexture) {
	return textureget(depthTexture, pos/ TEX_RESOLUTION).x; //  + shadowOffset;
}
/********* experiments with alternative filtering
// None very useful in this form
// If we want to try more sophisticated filtering,
// we could precompute the core and convolve with a 1 texel square filter
// (See earlier image display experiments)
#define pi 3.14159
// Lanczoss
float lanc(float x, float a) {
    return x == 0. ? 1. : x > a ? 0. : (a * sin(pi * x) * sin(pi * x / a) / (pi * pi * x * x));
}
// http://entropymine.com/imageworsener/bicubic/
float cub(float x, float B, float C) {
    x = abs(x);
    if (x<1.) return (12.-9.*B-6.*C)*x*x*x +
        (-18.+12.*B+6.*C)*x*x + (6.-2.*B);
    if (x<2.) return (-B-6.*C)*x*x*x + (6.*B+30.*C)*x*x +
        (-12.*B-48.*C)*x + (8.*B+24.*C);
    return 0.;
}

float mitch(float x) { return cub(x, 0.3333, 0.3333); } // Mitchell
float quad(float xx) { return xx > 1. ? 0. : 1. - 2.*xx + xx*xx; }
float lsq2(vec2 o) { return o.x*o.x + o.y*o.y; }  // length squared
***************************/

#define SIZE (float(SHADOWTYPE) * 0.5)

gene(shadowx, 0.75, 0.0, 2, 0.05, 0.05, shadows, frozen)  // extra size for linear shadow falloff

/**
dxy is point to test in 0..textureResolution units (NOT generally pixel aligned)
x,y are offsets in 0..textureResolution units; typically values like -2 or 1
depthz is the depth for testing
texelSize converts back to 0..1 units for actial texture lookup
size is size of convolution used in falloff weight computation
**/
void ShadPointTest(const vec2 dxy, const float x, const float y, const float depthz, const float texelSize, const float size, const sampler2D depthTexture, inout float tried, inout float seen) {
	vec2 pxy = dxy + vec2(x,y);					// sample point in 0..textureResolution
	pxy = floor(pxy) + vec2(0.5,0.5);			// centre the exact sample point
	float dd = length(pxy - dxy);				// establish distance from test point
	// float dd = dot(pxy - dxy, pxy - dxy)/2.;				// establish distance from test point, very slow with no optimization
	float w = max(size  + shadowx - dd, 0.);  	// weight, linear dropoff from centre
	// w = S(w/(size+shadowx));  // in case we want to apply mudulation function
	// if (w <= 0.) return;   // this considerably ADDS to the cost
		//~~~~~~~~~~~~
		// experiments with alternative weight filters
		// d1 = clamp(size - dd, 0., shadowsharp)/shadowsharp;  // flat top and reduce
		// w = (3. - 2.*d1)*d1*d1;  // smooth rolloff based on d1
		// w=d1;                    // direct based on d1
		// w = exp(-(oo.x*oo.x+oo.y*oo.y) * 2./size);
		// w = lanc(length(oo) * 2./size, 2.);
		// w = mitch(texelSize * dd /(size+0.5));
		// float w = quad(lsq2(oo) * 1./(size*size+0.01));
		//~~~~~~~~~~~~
	#if SHADOWTYPE == -9  // size 0, but for some reason 0 did not work
		w = 1.;
	#endif
	tried += w;						// accumulate the total wieght tried
	vec2 offset = pxy * texelSize;	// sample point in 0..1 ready for texture lookup
	//float shadowDepth = textureget(depthTexture, clamp(offset, 0.,1.)).x; // moved out of 'if' to reduce gradient divergence
	// clamp makes no performance difference (and it not relevant to logic as avoided elsewhere)
	float shadowDepth = textureget(depthTexture, offset).x; // moved out of 'if' to reduce gradient divergence
	//shadowDepth += texelFetch2D(depthTexture, ivec2(20,20), 0);

	/*** /  // this one makes the most sense, but behaves worse without optimization (85) and the same with (58)
	seen += step( depthz, shadowDepth) * w;
	return;
	/***/
	//if (true) {
	// The test below is not necessary as the forcing of depthz previously has ensured the correct result
	// However, removing the test considerably increases the cost (62 -> 85) unless we optimize
	// Bad results with just the x>0 part or just x<1, ok with both; the y tests don't seem to make much difference on way or the other
	// Again, optimization eliminates the difference.
	// 29/09/2020, y test added back in, it does prevent some false shadow errors
	// 29/09/2020, check reduced a fraction to stop occasional false edge lines
	const float l = 0.001, h = 1. - l;
	if ( (offset.x >= l)  && (offset.x <= h) && (offset.y >= l) && (offset.y <= h) ) { // test if inside shadow map region
		//if ( depthz <= shadowDepth )  seen += w; // old inefficient version kept for reference, sjpt, 27/11/2017
		seen += step( depthz, shadowDepth) * w;
	//} else if (shadowstrength < 0.) {
	//    seen = 1000.;  // << debug to indicate out of range of shadow camera, but -ve values useful
	} else {
		 seen += w; //  += 1.;  // if no shadow information, assume not shadowed
	}
}

// get shadow using some points, gives nasty shadows
float GetShadowXX(vec3 depth, sampler2D depthTexture) {
	float visibility = 1.0;

	// percentage closer filtering
	float texelSize = 1.0 / TEX_RESOLUTION;

	vec2 dxy = depth.xy * TEX_RESOLUTION;   // 0..TEX_RESOLUTION

	float seen = 0.;
    float tried = 0.;
	/*** /
		//ShadPointTest(dxy, -1.5, -1.5, depth.z, texelSize, SIZE, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, -1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, -1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		//ShadPointTest(dxy, 1.5, -1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);

		ShadPointTest(dxy, -1.5, -0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, -0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, -0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, -0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);

		ShadPointTest(dxy, -1.5, 0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, 0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, 0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, 0.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);

		//ShadPointTest(dxy, -1.5, 1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, 1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, 1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
		//ShadPointTest(dxy, 1.5, 1.5, depth.z, texelSize, 1.5, depthTexture, tried, seen);
	/*****/

	/******/
	float size = 2.;
	ShadPointTest(dxy, 0., 0., depth.z, texelSize, size, depthTexture, tried, seen);

	ShadPointTest(dxy, 1., 1., depth.z, texelSize, size,depthTexture, tried, seen);
	ShadPointTest(dxy, 1., -1., depth.z, texelSize, size,depthTexture, tried, seen);
	ShadPointTest(dxy, -1., 1., depth.z, texelSize, size,depthTexture, tried, seen);
	ShadPointTest(dxy, -1., -1., depth.z, texelSize, size,depthTexture, tried, seen);

	//ShadPointTest(dxy, 1., 0., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, -1., 0., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, 0., 1., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, 0., -1., depth.z, texelSize, size,depthTexture, tried, seen);

	//ShadPointTest(dxy, 2., 0., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, -2., 0., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, 0., 2., depth.z, texelSize, size,depthTexture, tried, seen);
	//ShadPointTest(dxy, 0., -2., depth.z, texelSize, size,depthTexture, tried, seen);
	/*************/

	visibility *= seen / tried ;
	return visibility;
}

// gets the visibility value for this texel
// uses PCF by default if weight is set to 1
// uses a variant to allow for position of
float GetShadowConv(const vec3 depth, sampler2D depthTexture)
{
	// percentage closer filtering
	float texelSize = 1.0 / TEX_RESOLUTION;

	vec2 dxy = depth.xy * TEX_RESOLUTION;   // 0..TEX_RESOLUTION

	float seen = 0.;
    float tried = 0.;
	#ifdef SIZE15
		float size = 1.5;
		ShadPointTest(dxy, -1.5, -1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, -1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, -1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, -1.5, depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -1.5, -0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, -0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, -0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, -0.5, depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -1.5, 0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, 0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, 0.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, 0.5, depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -1.5, 1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -0.5, 1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0.5, 1.5, depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1.5, 1.5, depth.z, texelSize, size, depthTexture, tried, seen);

	#elif defined(SIZE2)  // for some reason this is MORE expensive than the loop
		float size = 2.;
		ShadPointTest(dxy, -2., -2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -1., -2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0., -2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1., -2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 2., -2., depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -2., -1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -1., -1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0., -1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1., -1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 2., -1., depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -2., 0., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -1., 0., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0., 0., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1., 0., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 2., 0., depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -2., 1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -1., 1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0., 1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1., 1., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 2., 1., depth.z, texelSize, size, depthTexture, tried, seen);

		ShadPointTest(dxy, -2., 2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, -1., 2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 0., 2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 1., 2., depth.z, texelSize, size, depthTexture, tried, seen);
		ShadPointTest(dxy, 2., 2., depth.z, texelSize, size, depthTexture, tried, seen);
	#elif SHADOWTYPE == -9  // special case for single point
		ShadPointTest(dxy, 0., 0., depth.z, texelSize, 0., depthTexture, tried, seen);
	#else
		for (float y = -SIZE; y <= SIZE; y++) {
			for (float x = -SIZE; x <= SIZE; x++) {
				ShadPointTest(dxy, x, y, depth.z, texelSize, SIZE, depthTexture, tried, seen);
			}
		}
	#endif
	tried = max(tried, 1.);  // can be 0 at sides of box near front, and resulting errors propogate >>> todo track down how tried==0
	float vis = seen / tried ;
//visibility = min(visibility, 1.);
	return vis;
}

#if (SHADOWTYPE == -1)
#define GetShadow GetShadowBilin
#elif (SHADOWTYPE == -2)
#define GetShadow GetShadowBicubic
#elif (SHADOWTYPE == -3)
#define GetShadow GetShadowXX
#else
#define GetShadow GetShadowConv
#endif
//float s(float x) { return x; } // return -2.*x*x*x + 3.*x*x; }
/** bilinear */
float GetShadowBilin(const vec3 depth, sampler2D depthTexture)
{
	float texelSize = 1.0 / TEX_RESOLUTION;
	vec2 dxy = depth.xy * TEX_RESOLUTION;

	vec2 low = floor(dxy);
	vec2 part = dxy - low;
	low = low + vec2(0.5,0.5);
	float d00 = sdepth((low), depthTexture);
	float d01 = sdepth((low + vec2(0., 1.)), depthTexture);
	float d10 = sdepth((low + vec2(1., 0.)), depthTexture);
	float d11 = sdepth((low + vec2(1., 1)), depthTexture);
	float hit00 = float(depth.z <= d00);
	float hit01 = float(depth.z <= d01);
	float hit10 = float(depth.z <= d10);
	float hit11 = float(depth.z <= d11);
#define SS(x) ((x))
	float hit0x = mix(hit00, hit01, SS(part.y));
	float hit1x = mix(hit10, hit11, SS(part.y));
	float hitxx = mix(hit0x, hit1x, SS(part.x));
	float vis = hitxx;
	return vis;
}

/** return the cubic interpoplation through p0,p1,p2,p3 for point at f between p1 and p2
http://www.paulinternet.nl/?page=bicubic */
float cub(float p0,float p1,float p2,float p3, float x) {
    return p1 + 0.5 * x*(p2 - p0 + x*(2.0*p0 - 5.0*p1 + 4.0*p2 - p3 + x*(3.0*(p1 - p2) + p3 - p0)));
}

float GetShadowBicubic(vec3 depth, sampler2D depthTexture)
{
	float visibility = 1.0;

	float texelSize = 1.0 / TEX_RESOLUTION;
	vec2 dxy = depth.xy * TEX_RESOLUTION;

	vec2 low = floor(dxy);
	vec2 part = dxy - low;
	low = low + vec2(0.5,0.5);
	float dxx = sdepth((low + vec2(-1., -1.)), depthTexture);
	float dx0 = sdepth((low + vec2(-1., 0.)), depthTexture);
	float dx1 = sdepth((low + vec2(-1., 1.)), depthTexture);
	float dx2 = sdepth((low + vec2(-1., 2.)), depthTexture);

	float d0x = sdepth((low + vec2(0., -1.)), depthTexture);
	float d00 = sdepth((low + vec2(0., 0.)), depthTexture);
	float d01 = sdepth((low + vec2(0., 1.)), depthTexture);
	float d02 = sdepth((low + vec2(0., 2.)), depthTexture);

	float d1x = sdepth((low + vec2(1., -1.)), depthTexture);
	float d10 = sdepth((low + vec2(1., 0.)), depthTexture);
	float d11 = sdepth((low + vec2(1., 1.)), depthTexture);
	float d12 = sdepth((low + vec2(1., 2.)), depthTexture);

	float d2x = sdepth((low + vec2(2., -1.)), depthTexture);
	float d20 = sdepth((low + vec2(2., 0.)), depthTexture);
	float d21 = sdepth((low + vec2(2., 1.)), depthTexture);
	float d22 = sdepth((low + vec2(2., 2.)), depthTexture);

	float hitxx = float(depth.z <= dxx);
	float hitx0 = float(depth.z <= dx0);
	float hitx1 = float(depth.z <= dx1);
	float hitx2 = float(depth.z <= dx2);

	float hit0x = float(depth.z <= d0x);
	float hit00 = float(depth.z <= d00);
	float hit01 = float(depth.z <= d01);
	float hit02 = float(depth.z <= d02);

	float hit1x = float(depth.z <= d1x);
	float hit10 = float(depth.z <= d10);
	float hit11 = float(depth.z <= d11);
	float hit12 = float(depth.z <= d12);

	float hit2x = float(depth.z <= d2x);
	float hit20 = float(depth.z <= d20);
	float hit21 = float(depth.z <= d21);
	float hit22 = float(depth.z <= d22);

    float hitxq = cub(hitxx, hitx0, hitx1, hitx2, part.y);
    float hit0q = cub(hit0x, hit00, hit01, hit02, part.y);
    float hit1q = cub(hit1x, hit10, hit11, hit12, part.y);
    float hit2q = cub(hit2x, hit20, hit21, hit22, part.y);

    float hitqq = cub(hitxq, hit0q, hit1q, hit2q, part.x);
    hitqq = clamp(hitqq, 0., 1.);

	return hitqq;
}


/** compute the shadows, alos output vPosition to help the caller with cookie camera */
float getShadowA(const vec4 trpos, const mat4 lightmat, const sampler2D depthTexture, const vec4 light_camd, out vec4 vPosition) {
	vPosition = lightmat * trpos;
	vPosition.xy = (vPosition.xy / vPosition.w * 0.5 + 0.5) ;  // 0..1
	vPosition.z = vPosition.w;

	vec3 depth = vPosition.xyz;  // position the camera would have seen for this point

	// Different form of SHADEARLYTEST, by forcing z here we remove the need for the test at the pixel level.
	if (!( (depth.x >= 0.0) && (depth.x <= 1.0) && (depth.y >= 0.0) && (depth.y <= 1.0) ) )
		depth.z = -99999.;

	depth.z -= shadowdepthoffZ; // 0.0005;		// Offset depth a bit - solve shadow acne.  nb depth may be range -1..1, so subtract rather than multiply
	// incoming depth.z will be in real units, convert to 0..1 range to match values from the depth texture
	// depth.z = (depth.z - light_camd.x) * light_camd.y;
	depth.z = (log(depth.z) - light_camd.z) * light_camd.w;

	// float r = NONU(shadowstrength == 1. ? 1. :) GetShadow(depth, depthTexture);
	float r = GetShadow(depth, depthTexture);

	// r = mix(r, S(r), shadowuses);

	//r = S(r);
	//r = sqrt(r);
	r = mix(r, 1., xhornid == WALLID ? wall_shadowstrength : shadowstrength);
	return r;
}

#endif