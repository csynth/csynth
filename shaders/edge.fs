#version 300 es
precision highp float;
out vec4 glFragColor;
precision highp sampler2D;

// performance test
//#define edgeDensitySearch 9
//#define occludewidth 4
uniform int occludewidth, edgeDensitySearch;

uniform sampler2D rtopos, feedtexture;
uniform float revealstripes, capres, numInstances, RIBS, centrerefl;
uniform int edgestyle, edgewidth, colby, baseksize, profileksize;
uniform mat3 feedbackMatrix;
uniform mat4 feedbackTintMatrix;
uniform vec2 screen;
#define MAXPATHS 20
uniform float ribsa[MAXPATHS];
#define MXR 512. // fix 512 rather than ribs for multiplier, as different horns have different #ribs, so keys could get confused

uniform vec3 edgecol;

float ribkey(vec4 h, float ribs, float stripes) { // >>>>>
    float hx = clamp((h.x - capres*0.5) / (1.-capres), 0., 1.); // no ribs on caps

    // // towards consistent placement of ribs
    // float rp = h.x;
    // float spherenum = floor(lennum * capres * 0.5);
    // bodynum = lennum - 2.*spherenum;
    // float lo = -spherenum;
    // float hi = bodynum+spherenum;
    // rpx = lo + rp * (hi - lo);  // position extended beyond horn ends for rounding, range -r .. sbodynum+r
    // if (0. < rpx && rpx < bodynum) {
    //     float xrp = rp;         // old style
    //     lk = (xrp * uribs + 0.5);
    //     ribnum = floor(lk);



    // fix 512/MXR rather than ribs for multiplier, as different horns have different #ribs, so keys could get confused
    return h.z == -1. ? 1.e20 : floor(stripes * h.y) + stripes * (floor(ribs * hx) + MXR * h.z);
}

#define sqr(x) ((x)*(x))
vec4 tfetch(sampler2D tex, ivec2 ij, int m) {
    return texelFetch(tex, clamp(ij, ivec2(0,0), textureSize(tex, 0)-1), m);
}

/** look up value at point bi, offset by i,j;
t values are from rtopos z input, horn id, horn number, horn rib parity
chekif edge based on difference from t and d values  */
bool ttest(ivec2 bi, int i, int j, float t00, float txx, float d00) {
    vec4 v = tfetch(rtopos, bi + ivec2( i, j), 0);
    float tij = v.z, dij = v.w;
    return (tij != t00 && tij != txx && dij > d00);
}

void main()
{
    vec3 texpos; // position to use to compute texture
    vec3 xmnormal; /* normals etc in object space */
    // nb similar to code at getPosNormalColid above, and use of h00 etc in lights.fs
    vec2 b = gl_FragCoord.xy;
    ivec2 bi = ivec2(b);

    vec4 opos00 = tfetch(rtopos, bi, 0); // get horn source from OPSHAPEPOS buffer

    float hornid = floor(opos00.y);
    int hornidi = int(hornid);
   // edgestyle  // style of edges, 0 colour/label, 1, black on white, 2, white on black
    vec4 back = (edgestyle == 1) ? vec4(0.1,0.1,0.3,1) : vec4(0,0,0,1);  // nb does not apply if using feedback

    int k = baseksize;  // usually 1
    bool isback = opos00.w == 0.;
    if (isback) { //  background
    // old quick out for background and feedback removed
        if (edgestyle == 6) {glFragColor = vec4(-1,-1,-1,-1); return;} // quick out added back ??? 26 June 2023
        k = profileksize; // ?? k = 3. etc for thicker lines at boundary
    }


    // collect basic neighbour information, larger k will give thicker edges with minor errors
    vec4 oposaa = tfetch(rtopos,(bi + ivec2( k, 0)), 0);
    vec4 oposab = tfetch(rtopos,(bi + ivec2(-k, 0)), 0);
    vec4 oposba = tfetch(rtopos,(bi + ivec2( 0,-k)), 0);
    vec4 oposbb = tfetch(rtopos,(bi + ivec2( 0, k)), 0);
    // find the edge points that will be drawn
    float stripes = revealstripes;
    float ribs = ribsa[hornidi];
    if (hornidi < 0) ribs = 20.;
    if (hornidi > 20) ribs = 80.;
    // k?? is key, to distinguish ribs
    float k00 = ribkey(opos00, ribs, stripes), // full key for current point
            kaa = ribkey(oposaa, ribs, stripes),
            kba = ribkey(oposba, ribs, stripes),
            kbb = ribkey(oposbb, ribs, stripes),
            kab = ribkey(oposab, ribs, stripes);
    float t00 = opos00.z, taa = oposaa.z, tba = oposba.z, tbb = oposbb.z, tab = oposab.z; // t?? is tadnum (= hornnum)
    float d00 = opos00.w, daa = oposaa.w, dba = oposba.w, dbb = oposbb.w, dab = oposab.w; // d?? is depth

    vec3 colk = vec3(1.7, 2.9, 1.3);
    float colid = colby == 0 ? hornid : colby == 1 ? t00 : colby == 2 ? k00 : d00 * 1777.;
    int colidi = int(colid);

    // choose fill and edge colouring
    // check to see if we are in a rib, or in intersection/profile with another horn
    // may fail here horn wraps in front of itself and falsely assume rib
    float kuse = (t00 == taa && t00 == tab && t00 == tba && t00 == tbb) ?
        k00 + 1. : // all the same horn => a rib edge, +1 to avoid confusion with the real edge
        t00 * MXR; // a real edge
    // float h = opos00.z / numInstances * RIBS;  // instances are particles, z is not tadpoles
    float h = kuse * RIBS / (numInstances * MXR);

    //  ??? depth seems to be in range 0.0005 .. 0.0011, larger to the front
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ establish colours for edge, fill and occ (occluded)
    vec4 fill = (edgestyle == 1) ? vec4(1,1,1,1) : // plot: white, black edge, test vec4(d00 > 0.0005 ? 0 : 1,1,1,1)
        (edgestyle == 2) ? vec4(0,0,0,1) : // lino: black, white edge
        (edgestyle == 3) ? (colidi % 2 == 1 ? vec4(1,1,1,1) : vec4(0,0,0,1) ): // alt bw
        (edgestyle == 4) ? vec4(colidi % 2, (colidi/2)%2, (colidi/4)%2, 1): // alt primary
        (edgestyle == 5) ? vec4(sqr(fract(colid*colk)),1) : // alt varied
        // (edgestyle == 6) ? vec4(h,-1,-1,-1) : // edge for linefollow
        clamp(vec4(h, 1.-h, 0.24 * mod(opos00.z, 4.), 1), 0., 0.999);  // 0, odd debug colouring
    //vec4 edge =  vec4((1. - fill.rgb),1);
    vec4 edge = vec4(edgecol, 1);
    vec4 occ = fill; // occluded colour

    if (isback) { //  background
        if (feedbackMatrix[0][0] == 0.) {   // plain background, mainly for
            // fill = glFragColor = vec4(0.8,0.8,1,1);
            // edge = vec4(1,0,0,1);       // debug colours
            // occ = vec4(0,1,0,1);        // debug colours
            if (edgestyle == 6) { glFragColor = vec4(-1,-1,-1,-1); return; }
            fill = glFragColor = vec4(1,1,1,1);
            edge = vec4(1,1,1,1);           // ??? should adapt with edgestyle?
            occ = vec4(1,1,1,1);
        } else {
            occ = edge = fill;    // before fill overwritten
            //edge = vec4(1,0,0,1);       // debug colours
            //occ = vec4(0,1,0,1);        // debug colours
			// matrix use NOTE copied in cubeReflection.fs
            vec3 feedpos = vec3(b*screen * 2. - 1.,1) * feedbackMatrix; // feedback background
            vec2 feedpos2 = feedpos.xy/feedpos.z;                           // feedback perspective, eg -1..1
            vec2 smalltri = abs(mod(feedpos2*0.5 -0.5, 2.) - 1.);           // feedback mirrored repeat, eg 0..1
            smalltri = (smalltri-0.5) * centrerefl + 0.5;                   // extract from central subset, eg 0.25..0.75
            fill = texture(feedtexture,smalltri);
            fill *= feedbackTintMatrix; // ? will gl_FragColor.a = 1 ? NOTE copied in cubeReflection.fs
            fill /= fill.a; // not sure what this will do if color 'perspective' is used on feedbackTintMatrix mat3 may be enough
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ check for edge situations,
    // allow for 'normal'=horn1/horn1, profile=horn/background, rib=horn1.rib1/horn1.rib2
    bool isedge = !(k00 == kaa && k00 == kab && k00 == kba && k00 == kbb);
    if (isedge && isback) {glFragColor = edge; return;}  // take advantage of large profileksize

    bool behind = false;
    // it won't work reliably for intersection edges, the depth values will be close but randomly ordered
    float fnd = -1.; // frontmost neighbour depth, can clean up tests below
    float txx = -1.; // number for frontmost neighbour
    if (taa != t00 && daa > fnd) {fnd = daa; txx = taa; }
    if (tab != t00 && dab > fnd) {fnd = dab; txx = tab; }
    if (tba != t00 && dba > fnd) {fnd = dba; txx = tba; }
    if (tbb != t00 && dbb > fnd) {fnd = dbb; txx = tbb; }
    if (fnd > d00) behind = true;   // frontmost neighbour is in front of us
    if (fnd == -1.) {    // all neighbours in same horn, check ribs; equivalent to checking full keys as hornnums are the same
        if (k00 > kaa || k00 > kab || k00 > kba || k00 > kbb) behind = true;    // A lower number rib will win
    }
    if (behind && edgewidth == 1) {glFragColor = fill; return;} // avoid double lines, eg for plotting

    // reminder, if (isedge && isback) we don't get this far, but if we did we would find (behind == isedge)

    glFragColor = isedge ? edge : fill;  // until proven otherwise by occlusion

    #define xreturn return;  // or empty to fall through

    if (occludewidth != 0) {            // ??? use isedge &&  to save occluding something already white (but ??? fill ==? background)
        // occ = vec4(1,0,0,1);         // for test
        #define tttest(i, j) if (ttest(bi, i, j, t00, txx, d00)) {glFragColor = occ; xreturn}

        if (edgewidth == 1) txx = t00;
        if (edgeDensitySearch == -1) {   // sample search
            tttest(-occludewidth, -occludewidth)
            tttest(-occludewidth, occludewidth)
            tttest(occludewidth, -occludewidth)
            tttest(occludewidth, occludewidth)
            int o2 = occludewidth*2/3; // (occludewidth+1)/2;
            tttest(o2, 0)
            tttest(-o2, 0)
            tttest(0, o2)
            tttest(0, -o2)
        } else if (edgeDensitySearch == 0) { // full search
            for (int i = -occludewidth; i <= occludewidth; i++)
            for (int j = -occludewidth; j <= occludewidth; j++) {
                tttest(i, j);
            }
        } else if (edgeDensitySearch > -1) { // count different in front, and threshold with edgeDensitySearch
            int nbad = 0;
            for (int i = -occludewidth; i <= occludewidth; i++)    // ?? += 2 doesn't help as much as we might hope
            for (int j = -occludewidth; j <= occludewidth; j++) {
                //vec4 v = tfetch(rtopos,bi + ivec2( i, j), 0);
                //float tij = v.z, dij = v.w;
                //if (tij != t00 && tij != txx && dij > d00) nbad++;
                if (ttest(bi, i, j, t00, txx, d00)) nbad++;
            }
            if (nbad > edgeDensitySearch) {glFragColor = occ; xreturn}  // ???????
        } else if (edgeDensitySearch < 0) {
            // search for dense areas and don't overkill edges in them
            // For reason I can't fathom this is quicker than the simpler searches above, Stephen 6 Feb 2023
            // Commenting in/out code at the end of this < 0 case even changes the performance of the > 0 case.
            // Use of tfetch changes that a bit.
            int nbad = 0;
            float ts[18];
            // for (int i=0; i<NN; i++) ts[i] = -1.0;
            ts[0] = t00;
            int used = 1;
            float dmax = -9999.; // max depth for different object
            for (int i = -occludewidth; i <= occludewidth; i++)
            for (int j = -occludewidth; j <= occludewidth; j++) {
                vec4 v = tfetch(rtopos,bi + ivec2( i, j), 0);
                float tij = v.z, dij = v.w;
                if (tij != t00 && tij != txx) {
                    dmax = max(dmax, dij);
                    if (dij > d00) nbad++;
                }
                int u;
                for (u = 0; u < used; u++) {
                    if (tij == ts[u]) break;
                }
                if (u == used) {
                    ts[u] = tij;
                    used++;
                }
            }
            if (false) {}
            else if (nbad > -edgeDensitySearch)  {glFragColor = occ; xreturn}  // this makes it pretty much like the >0 case above
            else if (used <= 4 && dmax > d00) {glFragColor = occ; xreturn} // pretty much the same as the 0TT case for low density area
            else if (used > 4 && used <= 8 && mod(t00, 2.) != 0.) {glFragColor = occ; xreturn} // fill in a little
            else if (used > 8 && used <= 999 && mod(t00, 4.) != 0.) {glFragColor = occ; xreturn} // fill in even less

            // if ((nbad > -edgeDensitySearch) ||
            // (used <= 4 && dmax > d00) ||
            // (used > 4 && used <= 8 && mod(t00, 2.) != 0.) ||
            // (used > 8 && used <= 999 && mod(t00, 4.) != 0.))
            //     { glFragColor = occ; return; } // fill in even less
        }   // edgeDensitySearch < 0
    } // if occludewidth != 0
}
