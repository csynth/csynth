#ifndef NOEDGEMAIN
    #line 2
    #define EDGEMAIN
    precision highp float;
    out vec4 glFragColor;
    precision highp sampler2D;
    #define OPOSZ 1.
    #define edgeidlow 0.
    #define edgeidhigh 9999.
    #define OUT
    #define INOUT

    uniform sampler2D rtopos;
//#    uniform sampler2D rtshapepos;  	// not used, OPOSZ is 1 for edge2
//#    mat4 rot4;  						// <<< not used, OPOSZ is 1 for edge2
    uniform sampler2D tadprop;			// to get radius for varying pen width, and to get colour; not used by edge2
    uniform float edgewidth, edgeDensitySearch, baseksize, radkmult, occludedelta, profileksize, altstyle, occludewidth;
    uniform float test1, test2, test3;
    uniform vec3 edgecol, occcol, profcol, fillcol, unkcol, backcol, wallcol;
    uniform vec3[8] custcol;
    const float WALLID = 2.;
    float colourid;
    uniform float colby;
    const float MAX_HORNS_FOR_TYPE = 16384.0; // this allows 16384 = 2**14 horns of a single type
    //const float _tad_h_ribs = 0.;
    uniform float _tad_h_ribs;

    uniform mat3 feedbackMatrix;
    uniform mat4 feedbackTintMatrix;
    uniform sampler2D feedtexture, flatMap;
    uniform vec2 screen;
    uniform float maxfeeddepth, centrerefl, centrereflx, centrerefly, renderBackground, useLanczos; //dead feed scale
    uniform vec3 springCentre;
    uniform float[30] ribsa;
#endif

#define MAXPATHS 30
uniform float hornvdepth[MAXPATHS];

/**** tfetch and ttest from edge.fs, varied because edge.fs uses special format for rt opos ****/
/* tfetchx reads the pixel and extracts txx (tadpole number) and dxx (z value) */
// void tfetchx(sampler2D tex, ivec2 ij, int m, out float txx, out float dxx) {
//     vec4 v = texelFetch(tex, clamp(ij, ivec2(0,0), textureSize(tex, 0)-1), m);
//     txx = floor(v.w), dxx = v.z;
// }

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ lanczos
// from https://www.shadertoy.com/view/flVGRd
#define PI    3.1415926535897932384626433
#define PI_SQ 9.8696044010893586188344910
// #define SCALE .1 // Scale of image
// #define LANCZOS_SIZE 3 // Lanczos Kernel Size
//float saturate(float x) { return clamp(x, 0., 1.); }
//vec2 saturate(vec2 x) { return clamp(x, 0., 1.); }

float lanczosWeight(float x, float r) {
    if (x == 0.0) return 1.;
    return r * sin(PI * x) * sin(PI * x / r) / (PI_SQ * x*x);
}
float lanczosWeight(vec2 x, float r) {
    return lanczosWeight(x.x, r) * lanczosWeight(x.y, r);
}

/** coord in 0..1 space */
vec3 lanczos(sampler2D sampler, vec2 coord, int r) {
    vec2 res = vec2(textureSize(sampler, 0));
    vec2 pos = coord * res - 0.5;   // position, 0..textureSize-1 space
    vec2 bpos;                      // base position
    vec2 d = modf(pos, bpos);       // fractional position
    ivec2 ibpos = ivec2(bpos);      // base position, int

    if (useLanczos == -1.) return texelFetch(sampler, ibpos, 0).rgb; // discrete pixels for comparison
    if (useLanczos == -2.) return texture(sampler, coord).rgb; // standard (interpolation) comparison,
    if (useLanczos == -3.) return vec3(1,0,0);

    vec3 total = vec3(0); float totw = 0.;
    for (int x = -r+1; x <= r; x++) {
        for (int y = -r+1; y <= r; y++) {
            ivec2 offs = ivec2(x,y);
            vec3 val = texelFetch(sampler, ibpos + offs, 0).rgb;
            // float weight = lanczosWeight(clamp(d + offs,vec2(-r), vec2(r)), float(r));
            float weight = lanczosWeight((vec2(offs) - d), float(r));
            total += val * weight;
            totw += weight;

        }
    }
    // return vec3(d, 0);
    return total / totw;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// tfetchm is a macro so it can conveniently declare txx, dxx
// floor below means rib number is not part of txx, so ribs of the same tadpole cannot occlude each other
// it extracts values from rtshapepos or rt opos, depending on OPOSZ
// 7. is temp pending geting ribnum elsewhere

#define tfetchmx(ij, txx, dxx, qfloor) \
    float txx, dxx; \
    { vec4 v = texelFetch(rtopos, clamp(ij, ivec2(0,0), textureSize(rtopos, 0)-1), 0); /* v = vec4(0.5, 0.5, 297, 115059); */\
    txx = qfloor(v.w); \
    dxx = txx == 0. ? -1e20 : v.z; }

// NO floor in tfetchmr means rib number is part of txx, so alternate ribs can be shaded
#define tfetchm(ij, txx, dxx) tfetchmx(ij, txx, dxx, floor)
#define tfetchmr(ij, txx, dxx) tfetchmx(ij, txx, dxx, )

/** test if point @ bi+(i,j) key tij, dist dij is in front of base point @bi, key t00, dist d00 */
bool ttest(ivec2 bi, int i, int j, float t00, float txx, float d00) {  // nb i, j are offsets
    //float tij, dij;
    tfetchm( bi + ivec2( i, j), tij, dij);
    return (tij != t00 && tij != txx && dij > d00+occludedelta);
}

/** occk is the kernel size for test, may be occludewidth or profileksize
checkNeighbours is only for edges with edge width = 1 as we need to test for neighbours as well, checkNeighboursk = 0 for profile.
edge width = 1 is mainly used for plotter preparation, and possibly never seriously used for standard render ???
*/
bool testOcclude(float occk, float checkNeighboursk) {
    /**** below from edge.fs for occlusion */
    if (occk != 0.) {
        ivec2 bi = ivec2(gl_FragCoord.xy);
        tfetchm( bi, t00, d00);
        float dxx = -1.;    // frontmost neighbour depth, can clean up tests below
        float txx = -1.0;   // frontmost neighbour tad number
        if (checkNeighboursk != 0.) {
            int k = int(checkNeighboursk);
            // float k = (t00 < MAX_HORNS_FOR_TYPE * 3.) ? profileksize : baseksize;
            // collect near neighbour info
            tfetchm((bi + ivec2( k, 0)), taa, daa);
            tfetchm((bi + ivec2(-k, 0)), tab, dab);
            tfetchm((bi + ivec2( 0, k)), tba, dba);
            tfetchm((bi + ivec2( 0,-k)), tbb, dbb);

            // and find frontmost neghbour of different txx at depth dxx
            if (taa != t00 && daa > dxx) {dxx = daa; txx = taa; }
            if (tab != t00 && dab > dxx) {dxx = dab; txx = tab; }
            if (tba != t00 && dba > dxx) {dxx = dba; txx = tba; }
            if (tbb != t00 && dbb > dxx) {dxx = dbb; txx = tbb; }
        }

        // int occk = int(occlude width * k);
        if (edgewidth == 1.) txx = t00;
        int iocc = int(occk);
        if (edgeDensitySearch != -1999.) {   // sample search
            // search for neightbour points in different object and in front of t00
            // n.b. txx usually -1 and irrelevant ???
            #define tttest(i, j) if (ttest(bi, i, j, t00, txx, d00)) {return true;}
            tttest(-iocc, -iocc)
            tttest(-iocc, iocc)
            tttest(iocc, -iocc)
            tttest(iocc, iocc)
            int o2 = iocc*2/3; // (occlude width+1)/2;
            tttest(o2, 0)
            tttest(-o2, 0)
            tttest(0, o2)
            tttest(0, -o2)
        } else { // if (edgeDensitySearch == 0) { // full search, very slow and hardly any better
            for (int i = -iocc; i <= iocc; i++)
            for (int j = -iocc; j <= iocc; j++) {
                tttest(i, j);
            }
        }
    }
    return false;
}

const int edgefill = 0;
const int edgeedge = 1;
const int edgeocclude = 2;
const int edgeprofile = 3;
const int edgewall = 4;
const int edgeback = 5;
// const int edgeunk = 6; edgeunk not used, 6 April 2024

float g_h00;
vec4 oposfeed;

/** find out edge status; 0: normal */
int edgeStatus(out bool alt) {
    alt = false;
    // float h00, haa, hab, hba, hbb;

    ivec2 bi = ivec2(gl_FragCoord.xy);
    oposfeed = texelFetch(rtopos, clamp(bi, ivec2(0,0), textureSize(rtopos, 0)-1), 0);
    int k = int(baseksize);
    // for now, radius based width is only supported for tadpoles in non-main mode
    // ??? this radius is not used for radius itslef, just used to to set variable pen width
    // ??? and anyway we don't jave RIBS defined even for tadpoles ???
    // NOTE: similar test for colourid below, may common up???
    #if !defined(EDGEMAIN) && defined(RIBS)
        if (radkmult != 0.) {
            vec4 v = oposfeed;
            float rad = 1.;
            if (oposHornnum != 0.) {
                vec4 tprop = texture(tadprop, vec2(v.x, oposHornnum/_tad_h_ribs));
                rad = tprop.x;
            }
            k = int(baseksize + rad * radkmult);
        }
    #endif

    // note: tfetchmr defines and sets hoo, dxxxx, haa &c
    bool isedge;
    tfetchmr(bi,   h00, dxxx);
    g_h00 = h00;
    {   // limited scope to check for variable 'leakage'
        tfetchmr((bi + ivec2( k, 0)), haa, dxxxaa);
        tfetchmr((bi + ivec2(-k, 0)), hab, dxxxab);
        tfetchmr((bi + ivec2( 0, k)), hba, dxxxba);
        tfetchmr((bi + ivec2( 0,-k)), hbb, dxxxbb);
        // edge width 2, != gives double width (repeated for each side)
        // edge width 1, < gives single width edges,
        // edge width other (eg 1.5), gives double width edges with single width rib edges_tad_h_ribs
        float hq00 = floor(h00);
        isedge =
            edgewidth == 2. ? ((haa != h00) || (hab != h00) || (hba != h00) || (hbb != h00)) :
            edgewidth == 1. ?  ((haa < h00) || (hab < h00) || (hba < h00) || (hbb < h00)) :
            // edgewidth == 1. ?  ((dxxxaa < dxxx && haa != h00) || (dxxxab < dxxx && hab != h00) || (dxxxba < dxxx && hba != h00) || (dxxxbb < dxxx && hbb != h00)) :
                fract(h00) == 0. ? ((haa != h00) || (hab != h00) || (hba != h00) || (hbb != h00)) :
                    ((floor(haa) != hq00) || (floor(hab) != hq00) || (floor(hba) != hq00) || (floor(hbb) != hq00));
    }
    int r;
    bool isback = false;
    // if (isedge) return edgeedge; // this test indicates isedge is correct
    #ifdef EDGEMAIN
        // if we are not in EDGEMAIN colourid will already have been set by getPosNormalColid(), allowing for tadpoles as needed
    {
        colourid = floor(h00 / MAX_HORNS_FOR_TYPE);  // for real horns, with tadpoles will always give 4?
        #ifdef TADPOLES
        if (colourid == 4.) {
			// some of this code should be commoned up/factored out
            vec4 oposi = oposfeed; // texelFetch(rtopos, clamp(bi, ivec2(0,0), textureSize(rtopos, 0)-1), 0);
            float w = oposi.w;
            float oposHornid = floor(w / MAX_HORNS_FOR_TYPE);
            float oposHornnum = floor(w - oposHornid * MAX_HORNS_FOR_TYPE);
            vec4 tprop = texture(tadprop, vec2(oposi.x, oposHornnum/_tad_h_ribs));
            colourid = tprop.y;
        }
        #endif
    }
    #endif

    if (colourid == WALLID) {isback = true; r = edgewall; }
    if (colourid == 0.)  {isback = true; r = edgeback; }
    if (isback) {      // either wall or background
        if (testOcclude(profileksize, 0.)) r = edgeprofile;
    } else { // used to test (edgeidlow <= colourid && colourid <= edgeidhigh) but tad colourid code above broke that, and now being done in lights.fs 6Apr2024
        // check for alternation
        int ee = int(altstyle);
        if (ee != 0) {
            if ((ee&1) == 1) {
                if (fract(h00) == 0.) alt = !alt;
            }
            if ((ee&2) == 2) {
                if (mod(floor(h00), 2.) == 1.) alt = !alt;
            }
            if ((ee&4) == 4) {
                if (mod(hornvdepth[int(colourid)], 2.) == 1.) alt = !alt;
            }
        }

        if (isedge) {
            r = testOcclude(occludewidth, edgewidth == 1. ? baseksize : 0.) ? edgeocclude : edgeedge;
        } else {
            r = edgefill; // WALL ID == colour id ? edge wall : edge fill; // WALL ID == colour id already handled
        }
    // } else {
    //     r = edgeunk;
    }
    return r;
}

vec4 vec4c(vec4 v) {return vec4(clamp(v.xyz, 0., 1.), 1);}
vec4 vec4c(vec3 v) {return vec4(clamp(v, 0., 1.), 1);}
vec4 vec4c(vec2 v) {return vec4(clamp(v, 0., 1.).xyx, 1);}
vec2 poww(vec2 a, float b) {return pow(a, vec2(b));}
vec3 poww(vec3 a, float b) {return pow(a, vec3(b));}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ feed stuff here
/** return a lookup in feedback buffer, feedpos assumed to be in range -ar..ar x -1..1  OR ? both -1..1 */
vec4 trifeed(vec3 feedpos, sampler2D map, inout float feeddepth) {
    // https://stackoverflow.com/questions/1073606/is-there-a-one-line-function-that-generates-a-triangle-wave
    // these behave pretty much the same except for phase; which is difficult to reconcile
    // https://www.desmos.com/calculator/zs90mgkwme
    vec3 feedpos1 = feedpos * feedbackMatrix;
    vec2 feedpos2 = feedpos1.xy/feedpos1.z;  // feedback perspective, eg -1..1
    vec2 y1 = abs(mod(feedpos2*0.5 - 0.5, 2.) - 1.);  //dead after *0.5     *feed scale
    vec2 cr = vec2(centrereflx, centrerefly) * centrerefl;
    vec2 smalltri = (y1 - 0.5) * cr + 0.5;
    // smalltri = clamp(smalltri, 0.005, 0.995);  // avoid joint lines in corefixfeed; fix in feedback setup instead (feed.coreuse)
    vec4 fill = texture(map, smalltri);
    // if (test3 == 2.) {
        // fill = texelFetch(map, ivec2(gl_FragCoord.xy), 0);  // special case 1 to 1 feedback
        // fill = texelFetch(map, ivec2(smalltri), 0);  // special case 1 to 1 feedback
    // }
	feeddepth = fill.a - 1./255.;

    if (useLanczos != 0.) {
        fill = vec4(lanczos(map, smalltri, int(useLanczos)), texture(map, smalltri).a);
    }
    if (feeddepth*255. < 255. - maxfeeddepth - 0.1) {
        // if this is doubling as alpha channel we need to limit it
        // There are still compromises with use as alpha (eg in mini version width direct render to canvas) when feedback depth is large.
        feeddepth = 1. - maxfeeddepth/255.;
        return vec4(backcol, 1.);
    }
    fill.a = 1.;
    fill *= feedbackTintMatrix; // ? will gl_FragColor.a = 1 ? NOTE copied in edge.fs
    fill /= fill.a; // not sure what this will do if color 'perspective' is used on feedbackTintMatrix mat3 may be enough
    return fill;
}

vec3 screenfeed(vec3 r, inout float feeddepth) {
    if (feedbackMatrix[0][0] == 0.) { feeddepth = 0.; return r; }
    vec2 pos = gl_FragCoord.xy*screen * 2. - 1.;      // x and y in range -1..1
    // pending pos.x *= screen.y / screen.x;                     // x to range -ar..ar
    vec3 feedpos = vec3(pos, 1);
    // feedpos.x *= -1.;
    return trifeed(feedpos, feedtexture, INOUT feeddepth).rgb;
}

// note on feeddepth
// stored value is 1 - feeddepth/255. This means if it is used as alpha channel low feedback areas are not (too) corrupted
vec4 edgeColour(out bool alt, out int etype) {
    etype = edgeStatus(OUT alt);
    // etype = edgeedge; // alt = false; return vec4(0,1,0,1);

    vec3 r; float feeddepth = 1.; //
    // should be 0, but in mini version it gets used as opacity, to fix.
    // and does copyFramebufferToTexture lose w ???
    switch (etype) {
        case edgefill: {
            if (colby == 1.) r = pow(vec3(fract(colourid * 9.78), fract(colourid * 11.34), fract(colourid * 17.917)) * 1.3, vec3(2.2));
            #ifdef EDGEMAIN
                else if (colby == 2.) r = custcol[int(colourid) % 6 + 1];
            #else
                else if (colby == 2.) r = stdcolY(colourid);
            #endif
            else if (colby == 3.) r = custcol[int(hornvdepth[int(colourid)]) % 6 + 1];
            else if (colby == 4.) r = custcol[int(oposfeed.x * floor(ribsa[int(colourid)])) % 6 + 1];
            // else if (colby == 5.) r = custcol[int(g_h00 * 2.) % 6 + 1];
            else if (colby == 5.) r = custcol[colourid > 15. ? 7 : int(colourid) % 6 + 1];
            else r = fillcol;
        } break;
        case edgeedge: r = edgecol; break;
        case edgeprofile: r = profcol; break;
        case edgeocclude: r = occcol; break;
        // case edgeunk: r = unkcol; break;
        case edgewall: r = wallcol; break; // should never happen in standalone mode
        case edgeback: r = renderBackground == 0. ? backcol : screenfeed(backcol, INOUT feeddepth); break;
        default: r = unkcol; // vec3(1,0,0);
    }
    if (alt) r = 1. - r;
    return vec4(r, feeddepth);
}


#ifdef EDGEMAIN
void main() {
    bool alt; int etype;
    glFragColor = edgeColour(alt, etype);

    // texelFetch(sampler, ibpos, 0).rgb;

    // if (alt) r = pow(1. - sqrt(r), vec3(2.2));
    // glFragColor = vec4(r, feeddepth);
    //glFragColor.r = float(etype);
    //glFragColor.g = colourid;

}

#endif
