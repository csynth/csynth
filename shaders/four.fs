// four.fs <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// initial experiment towards generating different variant materials
// define OPMODE below for a 'fixed' material
//#define xOPMODE OPREGULAR

/**
Note on terminology.
opos:       original grid position                                  (grid/mesh space)
shapepos:   transformed horn position    shapepos = tr (opos)       (model space)
trpos:      position after rot4 applied  trpos = shapepos * rot4    (world space)

texpos:     position to use for texture                             (model space)
            texpos is almost always the same as shapepos
            We lost the information passing needed to distinguish with more complex pipelines.

We do not use modelMatrix for the main work,
but rather use rot4 (applied on right, not left).
This is because of (broken?) support for real 4d, where rot4 behaves differently from conventional modelMatrix

>>> TODO Nov 2017, remove NO TR stuff for wall normals different from other normals,
including remove multifact, and normal code in hornmaker NO TR , around !!!

**/

#define FORCEVER 0.0016

// this is used to comment out control code that breaks uniform flow
// if defined as NONU(x) x the control flow code is allowed
#ifdef NONUNIFORM
	#define NONU(x) x
#else
	#define NONU(x)
#endif

#ifdef U360
    varying vec4 poskey;    // used to check for wraparound
#endif


#define init(x) = x
uniform float appTime;
uniform vec3  gbuffdot; // used so skelbuffer can output different coords
uniform sampler2D rtopos;		// sampler used in OPOPOS2COL to hold output of OPOPOS
uniform sampler2D rtshapepos;		// sampler used in OPTSHAPEPOS2COL to hold output of OPSHAPEPOS
uniform sampler2D colbuff;		// sampler used to hold colours
uniform sampler2D feedtexture;		// feedback for mini/NFT

uniform sampler2D pickrt;  //pick texture
uniform float cameraAspect;

// temporarily genes for tuning, then maybe const/define
gene(multifact, 16, 0,64,1,1,gtex,frozen)  // find best multiplex value
gene(multiquatfact, 0.45, 0,1,0.1,0.01,gtex,frozen)  // multiplier for quaternion/normal so it fits in 0..1
gene(xxoposprop, 0, 0,1, 1,0.1, gtex, frozen) // proportion of 'position' color to use, 0 for normal colouring

gene(latenormals, 1, 0,20, 1,1, gtex, frozen) // apply normals late, value is sampling distance (also modified by baseksize)
// ge ne(latenormalsnearenough, 8, 0,20, 1,1, gtex, frozen) // fallback test for near enough
gene(latenormalsred, 0, 0,100, 10,10, gtex, frozen) // show latenormals errors (red channel)
gene(cutx, 0, 0.8, 4, 0.05, 0.01, gtex, frozen ) // cut ratio for VR in x , 2.5 for VR
gene(cuty, 0, 0.8, 4, 0.05, 0.01, gtex, frozen ) // cut ratio for VR in y , 2.2 for VR
gene(cutfall, 1.1, 1, 1.6, 0.05, 0.01, gtex, frozen ) // fall off radius factor after cut (1 is sharp)
gene(cutr, 0, 0, 1, 0.1, 0.1, gtex, frozen ) // red for cut section

gene(reveallow, 0, 0, 1, 0.001,0.0001, gtex, frozen) // gradually reveal
gene(revealhigh, 1, 0, 1, 0.001,0.0001, gtex, frozen) // gradually reveal
gene(revealstyle, -2, -2, 10, 1,1, gtex, frozen) // reveal style, -2 dis card, -1 black, other, use horn number (DOESN'T WORK)
gene(revealribs, 1, 1, 40, 1,1, gtex, frozen) // reveal # ribs
gene(revealstripes, 1, 1, 40, 1,1, gtex, frozen) // reveal # stripes
// some genes below only apply to edge. They don't really belong in four.fs, but here for convenience
gene(edgewidth, 1.5, 0.5, 2, 1,1, gtex, frozen)   // edge width, 1 = just use first horn, 2 use both sides of edge; 1.5, single ribs, others double, nb set during 4 style render
gene(OPOSZ, 0, 0, 1, 1,1, gtex, frozen)   // if 1, output z in output.w
gene(edgestyle, 0, 0, 7, 1,1, gtex, frozen)   // style of edges, 1 alternate ribs, 2 alternate horns, 4 alternate hornid
gene(occludewidth, 0, 0, 20, 1,1, gtex, frozen)   // size of occlusion zone
gene(occludedelta, 0.005, 0, 0.1, 0.001, 0.001, gtex, frozen)   // occlusion tolerance to stop 'V' occlusion
gene(edgeDensitySearch, -1, 0, 8, 1,1, gtex, frozen)   // fill overpopulated areas, -1 different neighbour count, 0 any neighour masks, >0 in front neighbour threshold
gene(baseksize, 1, 1, 6, 0.1,0.1, gtex, frozen)   // size for base edge detection kernel
gene(radkmult, 0, 0, 20, 0.1,0.1, gtex, frozen)   // multiplier for radius (where available) for basek
gene(profileksize, 1, 1, 16, 1,1, gtex, frozen)   // size for profile edge detection kernel
gene(colby, 0, 0, 3, 1,1, gtex, frozen)   // colouring (if used) for bw rendering
gene(renderBackground, 0, 0, 1, 0.01, 0.01, gtex, frozen)  // proportion of background to render; 0 falls through to dis card/backcol
uniform mat3 feedbackMatrix;        // rot, scale etc of feedback
uniform mat4 feedbackTintMatrix;          // rgb tint for edge feedback

// ge ne(patchNaN, 0, 0,1,1,1, gtex, frozen)  // test NaN output, 0 leave, 1 set 0, 2 set high col, -1, set -ve to 0


// BADBASE is passed down as bias in the .a component to indicate a bad normal
// badnormal detects this situation (as long as the raw .r is not > 5)
// and it can be compensated for if necessary by removing the BADBASE bias
// Not currently used as it was not being processed correctly, 10 April 2016
// #define BADBASE -100.


vec4 xcol = vec4(0.,0.,0.,0.);  // extra colour, may be set in various places including tranrule
// uniform vec2 screen; // now in common.vfs
uniform mat4 rot4;  // rotation part of viewing transform
uniform mat4 rot44d;  // 4d viewing transform
float colourid;

#include common.vfs;

/* notes on hornid
hornid is a uniform, used when NOT using singlemulti, where we have separate passes for each id
xhornid is more generally valid; set from uniform hornid outside singlemulti, and set from generated horn shader code in singlemulti at chooseHornCode
lhornid is local to OPSHAPEPOS
colourid is the final id used for colouring; very often = xhornid but can be overridden for special effects (eg tadpole getPosNormalColid)
*/
float xhornid;
#if OPMODE == OPREGULAR || OPMODE == OPOPOS2COL || OPMODE == OPSHAPEPOS || OPMODE == OPOPOS || OPMODE == OPMAKESKELBUFF || OPMODE == OPPOSITION || OPMODE == OPPICK || OPMODE == OPMAKEGBUFFX
	uniform float hornid;
	#define setxhornid xhornid = hornid;
	#define SETCOL
#elif 	OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL
	#define SETCOL
#endif

#if (OPMODE == OPREGULAR || OPMODE == OPOPOS || OPMODE == OPTEXTURE)
	varying vec4 opos;         // original position passed
    #define OPOSOK 0
#elif (OPMODE == OPOPOS2COL || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPSHAPEPOS)
	vec4 opos;				// found locally from lookup and passed
    #define OPOSOK 1      // will be valid, but needs to get from rtopos
#elif OPMODE == OPMAKEGBUFFX
    varying vec4 objpos;
    varying vec4 opos;
    #define OPOSVAR
#endif
#ifdef OPOSOK
    vec4 oposuvw;  // like the original opo s format
    float oposHornid, oposHornnum, oposDepth; // oposRibnum2; // formatted opo s information
#endif
// todo, note that always passing makes it look as if it is around at fragment when it may not be set in vertex
float reflnorm = 1.;  // keep track of reflections so normals can be corrected, passed from hornmaker to lights



/** do or don't include texture. shadows and lights */
#if (OPMODE == OPREGULAR || OPMODE == OPOPOS2COL || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL || OPMODE == OPMAKEGBUFFX)
    #include texture.fs;
    #include lights.fs;
#endif
// #if (OPMODE == OPOPOS)  // only for screen door
//     #include texture.fs;
// #endif

#if !(OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL || OPMODE == OPEDGE || OPMODE == OPEDGE2)
#include hornmaker.vs;
#endif


genet(screenDoor, 0, 0,1, 0.01, 0.001, texture, frozen)  // screen door transparency
//ge ne(screen DoorX, 1735.33, 0,100000, 100, 10, gtex, frozen)  // screen door X multiplier
//ge ne(screen DoorY, 29384.65, 0,100000, 100, 10, gtex, frozen)  // screen door Y multiplier
//ge ne(screen DoorZ, 0.197, 0,10000, 100, 10, gtex, frozen)  // screen door Z multiplier


/** rerange from -1..+1 to 0..1 */
float rerange(float x) { return x/2. + 0.5; }

/** distanceSquared */
float dist2(vec3 a, vec3 b) { vec3 c = a-b; return dot(c,c); }
float dist2(vec4 a, vec4 b) { vec3 c = a.xyz-b.xyz; return dot(c,c); }
//float min3(float a, float b, float c) { return min(min(a,b),c); }
//float min4(float a, float b, float c, float d) { return min(min(a,b),min(c,d)); }

// const float MAX_HORNS_FOR_TYPE = 16384.0; // this allows 16384 = 2**14 horns of a single type
// // It leaves the possibilty of around 2**(24-14) = 2**10 = 1024 horn types, which should be plenty.
// // Added as name, and increased from 4096, 20/07/2019

/** get hornid for given key */
float hornidx(float k) { return floor(k / MAX_HORNS_FOR_TYPE); }
/** find if two keys refer to same horn, ignore which rib and which pseudo-rib */
bool samehorn(float k1, float k2) { return floor(k1) == floor(k2); }

#if (OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL || OPMODE == OPOPOS2COL)

/** read and demultiplex the position/normal from  rtshapepos; this is NON bumped normal,
set colourid as biproduct
*/
virtual void getPosNormalColid(out vec3 xmnormal, out vec4 shapepos, out float thornid, out float fullkey) {
    vec2 b = gl_FragCoord.xy;
    #if OPMODE == OPOPOS2COL
        vec4 multi = opos; // already available // textureget(rtopos, b * screen); // get horn source from OPSHAPEPOS buffer
        if (OPOSZ == 1.) {
            fullkey = multi.w; //?? + (fract(multi.x * 37.) > 0.5 ? 0. : 0.5);
            thornid = floor(multi.w / MAX_HORNS_FOR_TYPE);
        } else {
            thornid = multi.w;
            fullkey = multi.w * MAX_HORNS_FOR_TYPE + multi.z;  // nb no ribnnum~
        }
        if (oposHornid == WALLID || oposHornid == 0.) thornid = oposHornid;
        xmnormal = vec3(0,0,1);
        shapepos = multi;
        return;
        // ??? check how much of multi we can sensibly use here
    #else
        vec4 multi = textureget(rtshapepos, b * screen); // get horn source from OPSHAPEPOS buffer
    #endif
    if (multi.w == 0. && renderBackground == 0.) discard; //  background
    fullkey = multi.w;
    thornid = hornidx(multi.w);
    // first latenormals experiment, no special handling for edges
    if (latenormals != 0.) {  // use neighbour pixels to calculate normals
        //xcol = vec4(1.,0.,0.,1.); xmnormal = vec3(0.,0.,1.); return;
        shapepos  = multi;

        float xd = latenormals * baseksize;	 // if not 0 then usually 1. for immediate neightbours
        vec4 tvp00 = multi;
        vec4 tvpaa, tvpab, tvpba, tvpbb;
        // this version with immediate neighbours
        tvpaa = textureget(rtshapepos, (b + vec2( xd, 0.)) * screen);
        tvpab = textureget(rtshapepos, (b + vec2(-xd, 0.)) * screen);
        tvpba = textureget(rtshapepos, (b + vec2( 0.,-xd)) * screen);
        tvpbb = textureget(rtshapepos, (b + vec2( 0., xd)) * screen);


        // find who they belong to
        float h00 = multi.w, haa = tvpaa.w, hba = tvpba.w, hbb = tvpbb.w, hab = tvpab.w;

        /****
        // rule out use of anything which is only a 2d neighbour, not a 3d neighbour
        // If this is too tight we get lots of black bits from no neighbour.
        // If it is loose enough, it doesn't actually seem to rule anything much out,
        // so just ignore it for now.  Leave code in case we want it again.
        // Stephen 4 Nov 2015

        // find distances
        float daa = dist2( tvp00, tvpaa);
        float dab = dist2( tvp00, tvpab);
        float dba = dist2( tvp00, tvpba);
        float dbb = dist2( tvp00, tvpbb);
        float dmin = min(daa, dab, dba, dbb);
        float dok = 3.*dmin;  // this needs to be much higher than that if used, and probably a fixed value

        float NOK = 999.*MAX_HORNS_FOR_TYPE;  // float for not at all ok
        if (daa > dok) haa = NOK;
        if (dab > dok) hab = NOK;
        if (dba > dok) hba = NOK;
        if (dbb > dok) hbb = NOK;
        ***/

        // find out which neighbours to use
        // .. first try to use exact matches, even down to pseudo-rib parity
        //        this preserves the sharp groove between pseudo-ribs
        //        otherwise we can get false highlights from a smoothed out groove
        // .. if we do not have enough detail from exact matches, use same horn and close ribs (latenormalsnearenough)
        //        this gives a second chance of a better normal
        //        and in particular helps counter z-fighting
        //        Very large values of latenormalsnearenough will counter z-fighting for branch structures
        //        where objects are often physically close and similar but have disparate rib-ids
        //        ??? what are the bad effects of overhigh latenormalsnearenough
        //            one is that we don't want to confuse with another rib behind me visible at my edge
        //            but actully that doesn't seem to matter, see comments on distance above
        //            but to reconsider?
        //        'close' z to verify we are almost on same surface, experiments ruled this out FOR NOW, 4 Nov 2015
        //        ??? is it worth trying to set this differently if we are in a branch structure ???
        // .. use centre if neighbour not suitable, and pass BADBASE flag on .a channel
        //        and latenormalsred on red channel (for debug, usually 0)

        // we did use (fuzzy) test for same horn and close enough ...
        //   abs(h00 - haa) < latenormalsnearenough
        //  but now just using same horn because of issues on branch

        // we used to use both left and right if possible, and both up and down
        // we now use left is possible, right if possible and left not possible
        // this prevents creases at join where we have faceting but do not distinguish with ribs etc
        vec3 uaa, uab, uba, ubb;
        if (haa == h00) {
            uaa = tvpaa.xyz;
            uab = (hab == h00) ? tvpab.xyz : tvp00.xyz;
        } else if (hab == h00) {
            uaa = tvp00.xyz;
            uab = tvpab.xyz;
        } else  {       // use 'same horn' in A direction, if ((haa != h00 && hab != h00))
            uaa = samehorn(h00, haa) ? tvpaa.xyz : tvp00.xyz;
            uab = samehorn(h00, hab) ? tvpab.xyz : tvp00.xyz;
        }

        if (hba == h00) {
            uba = tvpba.xyz;
            ubb = (hbb == h00) ? tvpbb.xyz : tvp00.xyz;
        } else if (hbb == h00) {
            uba = tvp00.xyz;
            ubb = tvpbb.xyz;
        } else  {       // use 'same horn' in A direction, if ((hba != h00 && hbb != h00))
            uba = samehorn(h00, hba) ? tvpba.xyz : tvp00.xyz;
            ubb = samehorn(h00, hbb) ? tvpbb.xyz : tvp00.xyz;
        }

        vec3 imnormal = cross(uba-ubb, uaa-uab);
        //debug imnormal = cross(tvpba.xyz-tvpbb.xyz, tvpaa.xyz-tvpab.xyz);

        // This will catch case where nothing even near enough in one A or B direction, or both
        // Could refine where one direction is OK.
        if (length(imnormal) < 0.000000001) {
            // debug, there are surprisingly many of these round the edges, TODO check
            postxcol = vec4(latenormalsred, 0.,0., 0.); // BADBASE); // do not try to use a channel
            xmnormal = vec3(0., 0., BADNORM);
        } else {
            xmnormal = normalize(imnormal);
            //xmnormal += vec3(0,0,0.000000000000001);  // bugs in side walls if this was omitted, not sure why >>> TODO
            xmnormal.y += 0.000000000000001;  // bugs in side walls if this was omitted, not sure why >>> TODO
        }
    } else {    // NOT   (latenormals != 0.), eg either not latenormals OR NO TR, demultiplex to get pos/normal
        shapepos = floor(multi)/multifact;
        vec4 q = fract(multi)/multiquatfact - 1.;
        // recover normal
        xmnormal = q.xyz;
    }

    if (cameraAspect < 0.) xmnormal *= -1.;
    shapepos.w = 1.;
    colourid = thornid; // till otherwise set
}  // end getPosNormalColid
#endif

// from http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
// variant of 'canonical one-liner' (mod before sin)
highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt, 2. * 3.14159);
    return fract(sin(sn) * c);
}

float flipbit(vec2 xy) {
	float x = floor(xy.x), y = floor(xy.y);
	float r = 0.;

	for (float i=0.; i<7.; i++) {
		r *= 2.;
		if (mod(x, 2.) == 1.) r += 1.;
		x = floor(x / 2.);
		r *= 2.;
		if (mod(y, 2.) == 1.) r += 1.;
		y = floor(y / 2.);
	}

	return r / (16. * 1024.);
}

#define MAXMPXRIBS 512.   // used for multiplexing horn# and ribs
float ribkey(vec4 h, float ribs, float stripes) {
    float hx = clamp((h.x - capres*0.5) / (1.-capres), 0., 1.); // no ribs on caps
    // fix 512 rather than ribs for multiplier, as different horns have different #ribs, so keys could get confused
    return h.z == -1. ? 1.e20 : floor(stripes * h.y) + stripes * (floor(ribs * hx) + MAXMPXRIBS * h.z);
}


void main() {
	#ifdef setxhornid
		setxhornid
	#endif
    float feeddepth; // = 999.;   // until proven otherwise
    #if OPMODE == OPOPOS && defined(SHARPPOINT) && !defined(NOHORNMAKER)
        if (vxrscale < 0.) discard; // NOT <- 0, walls give 0 radius
    #endif
    #if (defined OPOSOK && OPOSOK == 1)
	    opos = textureget(rtopos, gl_FragCoord.xy * screen);
    #endif
    #ifdef OPOSOK
        vec4 opos_wok = opos;   // copy of opos with corrected w
		// get OPOS information into useful canonical format
        if (OPOSZ == 0.) {
            oposHornid = opos_wok.w = round(opos.w);
            if (xhornid == WALLID) {
                oposHornnum = 0.;
                oposDepth = opos.z;
                oposuvw = opos;
            } else {
                oposHornnum = opos_wok.z = round(opos.z);
                oposDepth = 9999.;
                oposuvw = opos_wok;
            }
        } else if (OPOSZ == 1.) {
            // MAX_HORNS_FOR_TYPE*hornid +hornnum + mod(ribnum, 2.)*0.5 BUT ribnum not passed in varying
            float w = floor(opos.w * 2. + 0.1) * 0.5;  // allow for interpolation errors
            opos_wok.w = w;
            oposHornid = floor(w / MAX_HORNS_FOR_TYPE);
            oposHornnum = floor(w - oposHornid * MAX_HORNS_FOR_TYPE);
            // oposRibnum2 = fract(w);
            oposDepth = opos.z;
            oposuvw = vec4(opos.xy, oposHornid == WALLID ? opos.z : oposHornnum, oposHornid);
//if (OPMODE == OPOPOS) {gl_FragColor = opos_wok; return; }
        }
        colourid = xhornid = oposHornid;
    #endif

	#if (OPMODE == OPOPOS || OPMODE == OPSHAPEPOS || OPMODE == OPTEXTURE || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPREGULAR)
		vec2 _pp = (gl_FragCoord.xy * screen - 0.5) * vec2(cutx, cuty);
        float cutrad = _pp.x*_pp.x + _pp.y*_pp.y;
		if (cutrad > cutfall) {
			#if (OPMODE == OPTSHAPEPOS2COL || OPMODE == OPREGULAR)
				//gl_FragColor = vec4(cutr,0.,0.,1.);  // won't compile with our Aug 2016 version of Electron
				//return;
				discard;
			#else
				discard;
			#endif
		}
	#endif

	#ifdef SETCOL
		colourid = xhornid;	// unless overwritten elsewhere
	#endif
    #ifdef U360
        // check for both posky x,y are integer
        // if one is we are at some divide, but the divides do not align except at the back
        // so if BOTH are non-integer we must be from a triangle that spans the dateline divide round the back
        float d = 0.0001; // (or very nearly, interpolation errors)
        if ( fract(poskey.x + d) > 2. * d && fract(poskey.y + d) > 2. * d )
            discard;
    #endif
/*****************
	#if (OPMODE == OPREGULAR || OPMODE == OPOPOS || OPMODE == OPTEXTURE)
		if (o pos.x > 3.) dis card;
	#endif
***********/

    vec3 texpos;        // position to use to compute texture
    vec3 xmnormal;  /* normals etc in object space */

	#if (defined(NOTDEFINED))

   // note OPMODE may be shadows even if SHADOWS not defined, eg for deferred render pass
    #elif (OPMODE == OPSHADOWS)
        { // OPSHADOWS
    	//float sf = gl_FragCoord.z*gl_FragCoord.w; //NO gl_FragCoord w very different from gl_Position.w
        // Just letting gl_Position->gl_FragCoord do it's thing and everything works ok
        // float udepth = 1. / gl_FragCoord.w;
        // gl_FragColor = gl_FragCoord;  // for debug
        // gl_FragColor.x = udepth; // gl_FragCoord;
        gl_FragColor = vec4(999);  // ignored, would like it if we didn't need it at all
        } // OPSHADOWS
        } // return;;

    #elif (OPMODE == OPMAKESKELBUFF)
        gl_FragColor = objpos;
        } // return;;

    #elif (OPMODE == OPOPOS)		// save horn source information
        { // OPOPOS
        // PERFORMANCE CRITICAL: visited for every pixel in every triangle, regardless of depth and whether visible
        #ifdef SCREENDOOR
            if (screenDoor > 0.) {
                // performance not.  screenDoor can add quite a lot to execution time
                // but this appears to be because of the extra pixel calculations needed
                // rather than the cost of the screenDoor/rand itself

                // better but too expensive screen door, ?prepare single lookup texture for screenDoor
                // if (fract(o.x*screenDoorX + o.y*screenDoorY + o.z*screenDoorZ) < screenDoor) dis card;
                vec3 o = vec3(gl_FragCoord.xy, round(oposHornid));  // so that each object fades out

                // simple geometric, looks better to me than then rand one
                // but still has some patterns.
                // values in sd below chosen by fairly random experiment
                vec3 sd;
                //sd = vec3(screenDoorX, screenDoorY, screenDoorZ);
                sd = vec3(33.679, 13.4583, 2.713);
                o = o * sd;
                float p = fract(o.x + o.y + o.z);

                //float p = rand( vec2(o.x, o.y + 1.3*o.z) );

                // p = flipbit(gl_FragCoord.xy);

                if (p < screenDoor) discard;
            }
        #endif
        gl_FragColor = opos_wok;
#ifndef NOTR  // OPOPOS
// do not intergerize z for NOTR, opopos is 'real' value in that case
        if (OPOSZ <= 1.)
            {}
        else
            gl_FragColor.z = floor(gl_FragColor.z + 0.1);  // in case interpolation has upset these integer values
        // float k = ribkey(gl_FragColor, lennum, radnum) / (MAXMPXRIBS * numInstances / RIBS);
        // ??? can't we do reveal by entire ribs more efficiently in the fragment shader
        float k = (oposHornnum /*+o pos.x*/) / horncount; // don't bother to reveal along/around horn for now, but do roll out by particle
        if (k < reveallow || k >= revealhigh) {
            if (revealstyle == -2.) discard;    // don't render at all, things behind are visible
            if (revealstyle == -1.)
                gl_FragColor = vec4(-1, -1, -1, -1);
            else
                gl_FragColor.w = revealstyle;   // things behind rendered in another style, DOESN'T WORK, ?? killed/ignored by next pass ??
        }
#endif
        gl_FragColor.w = gl_FrontFacing ? (gl_FragColor.w) : 99.;  // often ignored as later stages recompute from splitk
		// todo choose best depth value for both tadpoles (w better) and horn (z better)
        if (OPOSZ <= 1.) {
            float numribs = makeribs(oposuvw);  // n.b. implicit input xhornid
            float rp = opos.x; float rpx = clamp((rp - 0.5 * capres) * (1. / (1. - capres)), 0., 1.);
            float ribnum = round(rpx * (numribs));    // todo, refine because of ends
            // gl_FragColor.w = round(gl_FragColor.w);
            gl_FragColor.w += mod(ribnum, 2.) * 0.5;
        } else if (OPOSZ == 2.) {  // used to be 1., no longer used except for edge/mini (and that only temporary?)10July2023
            gl_FragColor.w = gl_FragCoord.w;        // depth, used for edge finding in conjunction with edge.vs/edge.fs
            gl_FragColor.y += oposHornid;               // multiplex horn class (integer) into v (stripe/around) (fraction)
            // gl_FragColor.x = 99.;  // ??? dist along horn, used for ribs
            // gl_FragColor.z = 99.;  // ??? ???? hornnum
        } else if (OPOSZ == 5.) {
            gl_FragColor.b = 1.; // vec4(1,0,1,1);                        // temp used for mini
        } else if (OPOSZ == 3.) {
            vec4 rr = texture(feedtexture, gl_FragCoord.yx / 500.);
            gl_FragColor.g += rr.r;
            gl_FragColor.b = 0.; // vec4(1,0,1,1);                        // temp used for mini
        } else if (OPOSZ == 4.) {
            gl_FragColor = vec4(1,1,0,1);
        }
        } // OPOPOS
        } // return;;

    #elif (OPMODE == OPMAKEGBUFFX)
        gl_FragColor = objpos;
        // Colsurf colsurf = standardTexcol(objpos.xyz);
        Colsurf colsurf = iridescentTexcol(objpos.xyz, vec3(0,0,1), vec3(0,0,1)); // for CSynth override?
        vec3 c = floor(colsurf.col.xyz * 255.);
        gl_FragColor.w = dot(c, vec3(256*256, 256, 1));
        } // return;;

    #elif (OPMODE == OPPICK)   // unpack the pick data from pickVary and output
        int outslot = int(floor(gl_FragCoord.x));
        float v;
		gl_FragColor = (outslot == 0) ? pickVary0 : (outslot == 1) ? pickVary1 : (outslot == 2) ? pickVary2 :  pickVary3  ;
        } // return;;

    #elif (OPMODE == OPPOSITION)   // output scale information
        gl_FragColor = vec4( scaleVary, -scaleVary, scaleVary + 10000.,1.);  // experiment
       } // return;;

    #elif (OPMODE == OPEDGE || OPMODE == OPEDGE2)   // compute edges for plotter
    #error OPEDGE should not be compiled via four.fs; uses shaders/edge.fs and .vs
       } // return;;


    #elif (OPMODE == OPSHAPEPOS)  // save x,y,z
        { // OPSHAPEPOS local scope
        // perform basic geometry
        //vec4 o pos = o pos; //###vec4 o pos = textureget(rtopos, gl_FragCoord.xy * screen);  // get horn source position from rtopos buffer
		float lhornid = oposHornid;
		if (lhornid == 0.) discard;
		#ifndef SINGLEMULTI
			if (lhornid != hornid) discard;
        #endif

        #ifdef NOTR  // OPSHAPEPOS, only process for correct horn/non-horn
            if (lhornid != WALLID) discard;
        #else
            if (lhornid == WALLID) discard;
        #endif

		// oposHornid = 1.;
        //if (oposHornid != hornid) discard;
		#ifdef SINGLEMULTI
            if (lhornid != WALLID) {
                float vv = oposHornnum + 0.5;
                //>>> !!chooseHornCode!!						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
                $$$chooseHornCode$$						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
                lhornid = lhornid == 99. ? 1. : xhornid;
            }
		#endif
		float ribnum;  // ribbing along one horn
        vec4 shapepos = tr(oposuvw, OUT xmnormal, OUT texpos, OUT ribnum);    /* compute horn shape. inc normals etc */
        // vec4 trpos = vec4(99); // show trpos no used in this case ...

        // multiplex position and orientation into multi.xyz
        // record orientation just as normal
        //     prevously we stored orientation as quaternion for full orientation
        //     but this lost tdo much normal precision, and extra mu,mv only needed for bump mapping and could be recomputed
        vec4 multi;
        multi.xyz = floor(shapepos.xyz * multifact) + (xmnormal+1.) * multiquatfact;

        if (latenormals != 0.) multi = shapepos;    // but with latenormals we just save position

        // now multiplex hornid~hornnum~ribparity into multi.w; for NO TR we don't have the extra
        multi.w = MAX_HORNS_FOR_TYPE*lhornid + oposHornnum + mod(ribnum, 2.)*0.5;      // record horn detail, which horn multiplexed with which rib
        if (lhornid == WALLID) { //        #ifdef NOTR // OPSHAPEPOS
            multi.w = MAX_HORNS_FOR_TYPE * lhornid + ribnum;  // ribnum used as wallid for sharp wall edges with neighbour based normals
        } //        #endif
        gl_FragColor = multi;
        } // OPSHAPEPOS local scope
        } // return;;

    #elif (OPMODE == OPREGULAR)
        { // OPREGULAR}
		float zzzribnum;
        vec4 shapepos = tr(oposuvw, xmnormal, texpos, zzzribnum);    /* compute horn shape. inc normals etc */
        #ifdef USESKELBUFFER
                float vv = oposHornnum;
                $$$chooseHornCode$$						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
        #endif
        colourid = xhornid;
	    vec4 trpos = shapepos * rot4wx(hornid);         // do our 4d rotation, note lhornid is not available here
        gl_FragColor = lightingx(xmnormal, trpos, texpos, INOUT feeddepth);
        gl_FragColor.w = feeddepth;
        } // OPREGULAR
        } // return;;

    #elif (OPMODE == OPOPOS2COL)
        { // OPOPOS2COL
        //vec4 opo s = opo s; //###vec4 opo s = textureget(rtopos, gl_FragCoord.xy * screen);    // get horn source from rtopos buffer:  ox,oy,owhere, hornid
		//###opo s = opo s;  // needed for texture coordinate mixing
		xhornid = oposHornid;
		if (xhornid == 0.) {
            if (renderBackground == 0.) discard;   // standard background
            // ??? colourid = xhornid = oposHornid = WALLID;
            // could call lightingx here, bute seem  ???? to increase compile time
            // gl_FragColor = lightingx(vec3(0,0,1), vec4(gl_FragCoord.xy*test3, -1e10, 1), vec3(gl_FragCoord.xy*test3, -1e10)); return;
            // discard; // this will get background; TODO? could pick uip feedback here if relevant and avoid need for walls
        }
        #ifdef SIMPLESHADE
            gl_FragColor = vec4(fract(opos_wok.xyz * 1.97), 1.);
            return;
        #endif
		float zzzribnum;
        vec4 shapepos = (xhornid == WALLID) ? trwall(oposuvw, OUT xmnormal, OUT texpos, OUT zzzribnum) : // compute wall details, especially normals
                trhorn(oposuvw, OUT xmnormal, OUT texpos, OUT zzzribnum); // compute horn shape. inc normals etc
        if (xhornid != WALLID) {
            float vv = oposHornnum;
		    $$$chooseHornCode$$						         // make sure xhornid, ribs, ribdepth correct in SINGLEMULTI, noop if not SINGLEMULTI
            // if (xhornid != oposHornid) {gl_FragColor = vec4(1,1,0,1); return; }  // debug, xhornid should be unchanged
        }
        float zzfullkey; vec3 zzxmnormal; vec4 zzshapepos;
        if (xhornid != WALLID)
            getPosNormalColid(OUT zzxmnormal, OUT zzshapepos, OUT xhornid, OUT zzfullkey);  // nb sets colourid = xhornid from rtopos for OPMODE == OPOPOS2COL
        else
            getPosNormalColid(OUT zzxmnormal, OUT shapepos, OUT xhornid, OUT zzfullkey);  // nb sets colourid = xhornid from rtopos for OPMODE == OPOPOS2COL

        vec4 trpos = shapepos * rot4wx(xhornid);         // do our 4d rotation
        // getPosNormalColid sets colourid = xhornid from rtshapepos; but rtshapepos not valid in this case
        /// BUT we may want to get at some details such as tadpole based colourid set by tadpole override of getPosNormalColid

//if (length(xmnormal) < 0.1 || length(xmnormal) > 10.)
// xmnormal = vec3(0.,0.,1.);
   		colourid = xhornid; //  = oposHornid;
        if (xhornid == WALLID) {
            // int k = int(test2);
            // if ((k&1) != 0) xmnormal = normalize(vec3(2,3,-4));
            // if ((k&2) != 0) trpos = vec4(gl_FragCoord.xy*test3, -1e10, 1);
            // if ((k&4) != 0) texpos = vec3(gl_FragCoord.xy*test3, -1e10);
            // if (test3 != 0.) {
            //     xmnormal = vec3(0,0,1); trpos = vec4(gl_FragCoord.xy*test3, -1e10, 1); texpos = vec3(gl_FragCoord.xy*test3, -1e10);
            // } else  {
            //     xmnormal = vec3(0,0,1); /*trpos = vec4(gl_FragCoord.xy*test3, -1e10, 1);*/
        }

        gl_FragColor = lightingx(xmnormal, trpos, texpos, INOUT feeddepth);
        // if (colourid == WALLID) {gl_FragColor = vec4(0,1,1,1); return;}
        // mix in opo s information, for debug
        if (xxoposprop != 0.) {
            vec4 xopox = vec4(opos_wok.x, oposHornnum/1200.0, xhornid/3., 1.);
            if (xhornid == WALLID) xopox = vec4(texpos, 1.);
            xopox = clamp(xopox, vec4(0,0,0,1), vec4(1,1,1,1));
            gl_FragColor = mix(gl_FragColor, xopox, xxoposprop);
        }
        gl_FragColor.w = feeddepth;
        } // OPOPOS2COL
        } // return;;

    #elif (OPMODE == OPTSHAPEPOS2COL)  // need to do the real lighting calculations
        { // OPTSHAPEPOS2COL
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos
        //xmnormal = normalize(vec3(1));
        texpos = shapepos.xyz;
        vec4 trpos = shapepos * rot4wx(colourid);
        gl_FragColor = lightingx(xmnormal, trpos, texpos, INOUT feeddepth);
        if (cutrad > 1.0) {
            float k = (cutfall - cutrad) /(cutfall - 0.99999);
            gl_FragColor.xyz *= k*k*(3. - 2.*k);
        }
        gl_FragColor = clamp(gl_FragColor, 0., 1.);
        gl_FragColor.w = feeddepth;


// don't let NaN values through if they are generated
		// commented out; we try to prevent them getting generated in the first place
		// note that the odd NaN can proprogate badly with feedback
        // if (patchNaN == 0.) {
        // } else if (patchNaN == 2.) {
		//     ifNaN(gl_FragColor, vec4(991,991,0,1));						// highlight any NaN values trying to get through
        // } else if (patchNaN == 1.) {                                                   // if (patchNaN == 1.)
		//     ifNaN(gl_FragColor, vec4(0,0,0,1));						// patch any NaN values trying to get through
        // } else {    // -1
		//     gl_FragColor.xyz = max(vec3(0), gl_FragColor.xyz);	// hide <ve (?NaN) values trying to get through
        // }
/**
if (xhornid == -1.) gl_FragColor = vec4(1.,1.,1.,1.);
else if (xhornid == 0.) gl_FragColor = vec4(1.,0.,1.,1.);
else if (xhornid == 1.) gl_FragColor = vec4(1.,1.,0.,1.);
else if (xhornid == 2.) gl_FragColor = vec4(1.,1.,1.,1.);
else if (xhornid == 3.) gl_FragColor = vec4(0.,1.,0.,1.);
else if (xhornid == 4.) gl_FragColor = vec4(0.,0.,1.,1.);
else gl_FragColor = vec4(1.,1.,1.,1.);
**/
//gl_FragColor = vec4(qq(xhornid, 2),qq(xhornid, 4),qq(xhornid, 8),  1.);
//		gl_FragColor.x += FORCEVER;
        } // OPTSHAPEPOS2COL
        } // return;;

    #elif (OPMODE == OPBUMPNORMAL)  // need to do some of the real lighting calculations
        { // OPBUMPNORMAL
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos

        texpos = shapepos.xyz;
        vec4 trpos = shapepos * rot4wx(xhornid); // ?? was incorrect?? lhornid
		vec3 unusedviewdir;
		float unusedviewdist;
        gl_FragColor = vec4(getBumpedNormal(xmnormal, trpos, texpos, unusedviewdir, unusedviewdist), /**xxopos.w + MAX_HORNS_FOR_TYPE*xhornid */ fullkey);
        } // OPBUMPNORMAL
        } // return;;

    #elif (OPMODE == OPTEXTURE)  // comupte and save the texture, as viewed from the screen
        { // OPTEXTURE
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos
        texpos = shapepos.xyz / max(texscale, 0.0001);

        gl_FragColor.w = /**oposHornid +**/ MAX_HORNS_FOR_TYPE*xhornid;
        gl_FragColor.x = gl_FragColor.y = gl_FragColor.z = textvalmix(texpos.xyz, opos.xyz, texrepeat); // + texoffset;  to range approx 0 .. 1 //??? opo s_wok/uvw
        } // OPTEXTURE
        } // return;;

    #elif (OPMODE == -1)
		}
    #else
        hi hi hi unexpected OPMODE op mode
    #endif
// end of main(), but } added in each case above

// end overrides here, needed for overrides that access methods and uniforms, etc
$$$endoverrides$$
