// note, major rework after SVN 5410, if unwanted changes seen check back before that
#ifdef REFLECTION
uniform samplerCube cubeMap;
uniform sampler2D flatMap;

#define NOEDGEMAIN
#include edge2.fs;


vec4 GetReflection(in vec3 viewdir    /* direction from point to eye, pointing towards eye */,
                    in vec3 normal, in vec3 texpos, inout float feeddepth ) {
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
        // find value for r based on walls
        vec2 r = vec2(0.5, 0.5);
        if (nn.x > 0.999) r = rdx.zy;
        if (nn.y > 0.999) r = rdx.zx;
        if (nn.z > 0.999) r = rdx.xy;
        // if (m == rdx.z) r.y = - r.y;  // back wall
        // if (m == -rdx.z) r = -r;  // front wall
        // if (m == rdx.x) r.y = -r.y;  // right wall
        // if (m == -rdx.x) r = -r;  // left wall
        // if (m == rdx.y) r.x = -r.x;  // top wall
        // if (m == -rdx.y) r = -r;  // bottom wall

        //### r *= 3.;  // try a wall reflection repeat here
        fragColor = texcentre(r, flatMap, INOUT feeddepth);   // texcentre allows for mirrored texture and extraction of central region
    #else
        if (flatwallrefl) {
            vec4 rd;    // 10/1/20
            /**/
            #define boxl (_boxsize-0.01)  // slightly below for reliable test
            rd = rdopos;                    // we should have something to allow for size/aspect of walls here
            //dead if (abs(rdopos.x) >= boxl) rd.zy *= feed scale;
            //dead else if (abs(rdopos.y) >= boxl) rd.zx *= feed scale;
            //dead else if (abs(rdopos.z) >= boxl) rd.xy *= feed scale;
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
