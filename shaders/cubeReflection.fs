// note, major rework after SVN 5410, if unwanted changes seen check back before that
#ifdef REFLECTION
uniform samplerCube cubeMap;
uniform sampler2D flatMap;

gene(feedscale, 1, 0, 10, 0.1, 0.01, feedback, frozen)  // scaling for feedback
gene(centrerefl, 0.5, 0,1, 0.01, 0.01, feedback, frozen)  // centre area of texture to use for feedback
gene(flatwallreflp, 1, 0,1, 0.01, 0.01, feedback, frozen)  // 1 use wall position for feedback texture, 0 use 'reflection'

// look up texture from centrerefl square in centre of 2d texture
// r approx in range -1 .. 1
vec4 texcentre(vec2 r) {
    // vec2 r1 = (r + 3.) * 0.5 * feedscale;   // move r to +ve region with slope 1
    // vec2 odd01 = floor(mod(r1,2.));         // 0 for even, 1 for odd
    // vec2 oddpn = 1. - odd01 * 2.;           // 1 for even, -1 for odd
    // vec2 saw = fract(r1);               // sawtooth wave, 0..1
    // vec2 tri = saw * oddpn + odd01;     // triangle wave
    // vec2 smalltri = tri * centrerefl + (1.-centrerefl)*0.5;     // centred triangle wave

    // https://stackoverflow.com/questions/1073606/is-there-a-one-line-function-that-generates-a-triangle-wave
    // these behave pretty much the same except for phase; which is difficult to reconcile
    // https://www.desmos.com/calculator/zs90mgkwme
    vec2 smalltri = (abs(mod(r*0.5*feedscale,2.) - 1.)-0.5) * centrerefl + 0.5;
    return texture2D(flatMap, smalltri);
}

vec4 GetReflection(in vec3 viewdir    /* direction from point to eye, pointing towards eye */,
                    in vec3 normal, in vec3 texpos ) {
    vec3 reflectedDirection;
    vec4 rdopos = vec4(texpos, 1.); //  -boxsize..boxsize

    if (colourid == WALLID) {                   // wall normals can get badly computed
        if (abs(normal.x) < 0.01) normal.x = 0.;
        if (abs(normal.y) < 0.01) normal.y = 0.;
        if (abs(normal.z) < 0.01) normal.z = 0.;
    }
    reflectedDirection = normalize(reflect(viewdir, normalize(normal)));

    //??? // 10/1/20 vec4 rd = rdopos * rot4;   // rot4 here used to shape walls, only for wall notr flatwallrefl, should be indentity for VR???
#ifdef FLATWALLREFL
    #define flatwallrefl (colourid == WALLID)
#else
    #define flatwallrefl false
#endif

    vec4 fragColor;
    #ifdef FLATMAP
        vec3 rdx;
        if (flatwallrefl) {
            rdx = rdopos.xyz / _boxsize;       // -1 .. 1, but todo allow for wall shape/? OK as rdopos is from cube
            // if (rdx.y <= 0.001) rdx.y = -1.; // ???? patch for floor at 0 (eg Covid/dance), but instead don't use FLATWALLREFL
            rdx = mix(reflectedDirection, rdx, flatwallreflp);
        } else {
            rdx = reflectedDirection;
        }
        //#### rdx = normal;
        // vec3 ar = abs(rdx);
        // float m = max3(ar.x, ar.y, ar.z);
        // vec3 rr = rdx/m;
        // vec2 r = m == ar.x ? rr.zy : m == ar.y ? rr.xz : rr.xy;
        vec3 nn = abs(normal);
        ////vec2 r = rr.x > 0.99 ? rdx.zy : rr.y > 0.99 ? rdx.zx : rdx.xy;
        vec2 r = vec2(0.5, 0.5);
        if (nn.x > 0.99) r = rdx.zy;
        if (nn.y > 0.99) r = rdx.zx;
        if (nn.z > 0.99) r = rdx.xy;

        // if (m == rdx.z) r.y = - r.y;  // back wall
        // if (m == -rdx.z) r = -r;  // front wall
        // if (m == rdx.x) r.y = -r.y;  // right wall
        // if (m == -rdx.x) r = -r;  // left wall
        // if (m == rdx.y) r.x = -r.x;  // top wall
        // if (m == -rdx.y) r = -r;  // bottom wall

        //### r *= 3.;  // try a wall reflection repeat here
        fragColor = texcentre(r);   // texcentre allows for mirrored texture and extraction of central region
    #else
        if (flatwallrefl) {
            vec4 rd;    // 10/1/20
            /**/
            #define boxl (_boxsize-0.01)  // slightly below for reliable test
            rd = rdopos;                    // we should have something to allow for size/aspect of walls here
            if (abs(rdopos.x) >= boxl) rd.zy *= feedscale;
            else if (abs(rdopos.y) >= boxl) rd.zx *= feedscale;
            else if (abs(rdopos.z) >= boxl) rd.xy *= feedscale;
			/*** to do, consider stitiching **/
             /**/
            //rd.y *= -1.;
            fragColor = textureCube(cubeMap, mix(reflectedDirection, rd.xyz, flatwallreflp));
        } else {
            fragColor = textureCube(cubeMap, reflectedDirection);
        }
    #endif

    //ifNaN(fragColor, vec4(0,0,999,1));
	// clamp the value to reduce risk of feedback getting out of hand
	// soft clipping would be nicer, or just keep reflection values down a bit.
	// A sensible alternative (more to implement) would be to manage on fixed camera rendering
    return clamp(fragColor, 0., 1.);
}
#endif
