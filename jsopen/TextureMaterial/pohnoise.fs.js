window.THREE.ShaderChunk.O_pohnoise = `
// https://www.shadertoy.com/view/4sfGzS
// MichaelPohoreski, 2016-Feb-26
// Changes from Lance, Dec 2016
// pjt note that the shadertoy example this comes from includes a LUT based method
// that's apparently much faster
#if defined(POHNOISE) && !defined(_POHNOISE)
#define _POHNOISE
    float iqhash( float n ){
        return fract(sin(n)*43758.5453);
    }

    float _pohnoise( vec3 x ){
        // The noise function returns a value in the range -1.0f -> 1.0f ... NO 0..1
        vec3 p = floor(x);
        vec3 f = fract(x); // same as x-p; in [0,1]
        f = f*f*(3.0-2.0*f); // smooth step interpolation fraction
        //const float my = 57., mz = 113; // original very poor, many patterns
        //const float my = 17., mz = my*my; // too small; we see patterns
        const float my = 31., mz = my*my; // works well
        //const float my =131., mz = my*my; // too large; we get blocky artifacts
        float n = p.x + p.y*my + p.z*mz;
        return mix(
            mix(
                mix(iqhash(n   ), iqhash(n+   1.),f.x),
                mix(iqhash(n+my), iqhash(n+my+1.),f.x),
                f.y
            ),
            mix(
                mix(iqhash(n+   mz), iqhash(n+   mz+1.),f.x),
                mix(iqhash(n+my+mz), iqhash(n+my+mz+1.),f.x),
                f.y
            ),
            f.z
        );
    }

    gene(pohnoisen, 3,   1, 5, 1, 1, texturex, frozen) //number of scales for pohnoise
    gene(pohnoisek, 0.5, 0.01, 2, 0.01, 0.01, texturex, frozen) //scale factor for pohnoise (? related to fractal dimension)

    /* This is derived from the shadertoy example, with a little extra flexibility */
    float pohnoise(vec3 pos) {
        const mat3 m = mat3( 0.00,  0.80,  0.60,
                    -0.80,  0.36, -0.48,
                    -0.60, -0.48,  0.64 );
        vec3 q = 1.0 * pos;
        float k = pohnoisek, p = k, pp = 0.;
        float f  = p*_pohnoise( q ); q = m*q*2.01; pp += p; p *= k;
        if (pohnoisen > 1.5) { f += p*_pohnoise( q ); q = m*q*2.02; pp += p; p *= k; }
        if (pohnoisen > 2.5) { f += p*_pohnoise( q ); q = m*q*2.03; pp += p; p *= k; }
        if (pohnoisen > 3.5) { f += p*_pohnoise( q ); q = m*q*2.01; pp += p; p *= k; }
        if (pohnoisen > 4.5) { f += p*_pohnoise( q ); q = m*q*2.01; pp += p; p *= k; }
        f /= pp;
        return f;
    }

#endif
`
