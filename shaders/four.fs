#if OPMODE != OPTEST
// four.fs <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// initial experiment towards generating different variant materials
// define OPMODE below for a 'fixed' material
//#define xOPMODE OPREGULAR

/**
Note on terminology.
opos:       original grid position                                  (grid space)
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

uniform sampler2D pickrt;  //pick texture

// temporarily genes for tuning, then maybe const/define
gene(multifact, 16, 0,64,1,1,gtex,frozen)  // find best multiplex value
gene(multiquatfact, 0.45, 0,1,0.1,0.01,gtex,frozen)  // multiplier for quaternion/normal so it fits in 0..1
gene(xxoposprop, 0, 0,1, 1,0.1, gtex, frozen) // proportion of 'position' color to use, 0 for normal colouring

gene(latenormals, 1, 0,20, 1,1, gtex, frozen) // apply normals late, value is sampling distance
// ge ne(latenormalsnearenough, 8, 0,20, 1,1, gtex, frozen) // fallback test for near enough
gene(latenormalsred, 0, 0,100, 10,10, gtex, frozen) // show latenormals errors (red channel)
gene(cutx, 0, 0.8, 4, 0.05, 0.01, gtex, frozen ) // cut ratio for VR in x , 2.5 for VR
gene(cuty, 0, 0.8, 4, 0.05, 0.01, gtex, frozen ) // cut ratio for VR in y , 2.2 for VR
gene(cutfall, 1.1, 1, 1.6, 0.05, 0.01, gtex, frozen ) // fall off radius factor after cut (1 is sharp)
gene(cutr, 0, 0, 1, 0.1, 0.1, gtex, frozen ) // red for cut section

// ge ne(patchNaN, 0, 0,1,1,1, gtex, frozen)  // test NaN output, 0 leave, 1 set 0, 2 set high col, -1, set -ve to 0


// BADBASE is passed down as bias in the .a component to indicate a bad normal
// badnormal detects this situation (as long as the raw .r is not > 5)
// and it can be compensated for if necessary by removing the BADBASE bias
// Not currently used as it was not being processed correctly, 10 April 2016
// #define BADBASE -100.


vec4 xcol = vec4(0.,0.,0.,0.);  // extra colour, may be set in various places including tranrule
uniform vec2 screen;
uniform mat4 rot4;  // rotation part of viewing transform
uniform mat4 rot44d;  // 4d viewing transform
float colourid;

#include common.vfs;

float xhornid;
#if OPMODE == OPREGULAR || OPMODE == OPOPOS2COL || OPMODE == OPSHAPEPOS || OPMODE == OPOPOS || OPMODE == OPMAKESKELBUFF || OPMODE == OPPOSITION || OPMODE == OPPICK
	uniform float hornid;
	#define setxhornid xhornid = hornid;
	#define SETCOL
#elif OPMODE == OPTEXTURE
	#define SETCOL
#elif 	OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL
	#define SETCOL
#endif

#if (OPMODE == OPREGULAR || OPMODE == OPOPOS || OPMODE == OPTEXTURE)
	varying vec4 opos;         // original position passed
#elif (OPMODE == OPOPOS2COL)
	vec4 opos;				// found locally from lookup and passed
#elif (OPMODE == OPTSHAPEPOS2COL)
	#define opos (textureget(rtopos, gl_FragCoord.xy * screen))
#endif
// todo, note that always passing makes it look as if it is around at fragment when it may not be set in vertex
float reflnorm = 1.;  // keep track of reflections so normals can be corrected, passed from hornmaker to lights



/** do or don't include texture. shadows and lights */
#if (OPMODE == OPREGULAR || OPMODE == OPOPOS2COL || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL)
    #include texture.fs;
    #include lights.fs;
#endif
#if (OPMODE == OPOPOS)  // only for screen door
    #include texture.fs;
#endif


#if !(OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL)
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

const float MAX_HORNS_FOR_TYPE = 16384.0; // this allows 16384 = 2**14 horns of a single type
// It leaves the possibilty of around 2**(24-14) = 2**10 = 1024 horn types, which should be plenty.
// Added as name, and increased from 4096, 20/07/2019

/** get horn for given key */
float horn(float k) { return floor(k / MAX_HORNS_FOR_TYPE); }
/** find if two keys refer to same horn, ignore which rib and which pseudo-rib */
bool samehorn(float k1, float k2) { return horn(k1) == horn(k2); }

#if (OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL)

/** read and demultiplex the position/normal from  rtshapepos; this is NON bumped normal, set colourid as biproduct */
virtual void getPosNormalColid(out vec3 xmnormal, out vec4 shapepos, out float thornid, out float fullkey) {
        vec2 b = vec2(gl_FragCoord.xy);
        vec4 multi = textureget(rtshapepos, b * screen); // get horn source from OPSHAPEPOS buffer
        if (multi.w == 0.) discard; //  background
        fullkey = multi.w;
		thornid = horn(multi.w);
		// first latenormals experiment, no special handling for edges
		if (latenormals != 0.) {  // use neighbour pixels to calculate normals
			//xcol = vec4(1.,0.,0.,1.); xmnormal = vec3(0.,0.,1.); return;
            shapepos  = multi;

			float xd = latenormals;	 // if not 0 then usually 1. for immediate neightbours
			vec4 tvp00 = multi;
			// establish some interesting neighbours
            // Aa,Ab and Ba,Bb are opposite pairs
            /**
            // this version with diagonals
			vec4 tvpAa = textureget(rtshapepos, (b + vec2( xd, xd)) * screen);
			vec4 tvpAb = textureget(rtshapepos, (b + vec2(-xd,-xd)) * screen);
			vec4 tvpBa = textureget(rtshapepos, (b + vec2( xd,-xd)) * screen);
			vec4 tvpBb = textureget(rtshapepos, (b + vec2(-xd, xd)) * screen);
            **/

            // this version with immediate neighbours
			vec4 tvpAa = textureget(rtshapepos, (b + vec2( xd, 0.)) * screen);
			vec4 tvpAb = textureget(rtshapepos, (b + vec2(-xd, 0.)) * screen);
			vec4 tvpBa = textureget(rtshapepos, (b + vec2( 0.,-xd)) * screen);
			vec4 tvpBb = textureget(rtshapepos, (b + vec2( 0., xd)) * screen);


			// find who they belong to
            float h = multi.w, hAa = tvpAa.w, hBa = tvpBa.w, hBb = tvpBb.w, hAb = tvpAb.w;

            /****
            // rule out use of anything which is only a 2d neighbour, not a 3d neighbour
            // If this is too tight we get lots of black bits from no neighbour.
            // If it is loose enough, it doesn't actually seem to rule anything much out,
            // so just ignore it for now.  Leave code in case we want it again.
            // Stephen 4 Nov 2015

            // find distances
            float dAa = dist2( tvp00, tvpAa);
            float dAb = dist2( tvp00, tvpAb);
            float dBa = dist2( tvp00, tvpBa);
            float dBb = dist2( tvp00, tvpBb);
            float dmin = min(dAa, dAb, dBa, dBb);
            float dok = 3.*dmin;  // this needs to be much higher than that if used, and probably a fixed value

            float NOK = 999.*MAX_HORNS_FOR_TYPE;  // float for not at all ok
            if (dAa > dok) hAa = NOK;
            if (dAb > dok) hAb = NOK;
            if (dBa > dok) hBa = NOK;
            if (dBb > dok) hBb = NOK;
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
            //   abs(h - hAa) < latenormalsnearenough
            //  but now just using same horn because of issues on branch

            // we used to use both left and right if possible, and both up and down
            // we now use left is possible, right if possible and left not possible
            // this prevents creases at join where we have faceting but do not distinguish with ribs etc
            vec3 uAa, uAb, uBa, uBb;
            if (hAa == h) {
                uAa = tvpAa.xyz;
                uAb = tvp00.xyz;
            } else if (hAb == h) {
                uAa = tvp00.xyz;
                uAb = tvpAb.xyz;
			} else  {       // use 'same horn' in A direction, if ((hAa != h && hAb != h))
                uAa = samehorn(h, hAa) ? tvpAa.xyz : tvp00.xyz;
                uAb = samehorn(h, hAb) ? tvpAb.xyz : tvp00.xyz;
            }

            if (hBa == h) {
                uBa = tvpBa.xyz;
                uBb = tvp00.xyz;
            } else if (hAb == h) {
                uBa = tvp00.xyz;
                uBb = tvpBb.xyz;
			} else  {       // use 'same horn' in A direction, if ((hBa != h && hBb != h))
                uBa = samehorn(h, hBa) ? tvpBa.xyz : tvp00.xyz;
                uBb = samehorn(h, hBb) ? tvpBb.xyz : tvp00.xyz;
            }

            /***** old code kept for now, 9/11/2017, remove Dec 2017 TODO
			if ((hAa != h && hAb != h)) {       // use 'same horn' in A direction
				uAa = samehorn(h, hAa) ? tvpAa.xyz : tvp00.xyz;
				uAb = samehorn(h, hAb) ? tvpAb.xyz : tvp00.xyz;
            } else {    // at least one standard in A direction
				uAa = h == hAa ? tvpAa.xyz : tvp00.xyz;
				uAb = h == hAb ? tvpAb.xyz : tvp00.xyz;
            }

			if ((hBa != h && hBb != h)) {       // use 'same horn' in B direction
				uBa = samehorn(h, hBa) ? tvpBa.xyz : tvp00.xyz;
				uBb = samehorn(h, hBb) ? tvpBb.xyz : tvp00.xyz;
            } else {    // at least one standard in B direction
				uBa = h == hBa ? tvpBa.xyz : tvp00.xyz;
				uBb = h == hBb ? tvpBb.xyz : tvp00.xyz;
            }
            *****/
            vec3 imnormal = cross(uBa-uBb, uAa-uAb);
//imnormal = cross(tvpBa.xyz-tvpBb.xyz, tvpAa.xyz-tvpAb.xyz);

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

            #ifdef EDGES
                xmnormal.z += 16. * (float(hAa == h) + float(hAb == h) + float(hBa == h) + float(hBb == h));
            #endif

		} else {    // NOT   (latenormals != 0.), eg either not latenormals OR NO TR, demultiplex to get pos/normal
			shapepos = floor(multi)/multifact;
			vec4 q = fract(multi)/multiquatfact - 1.;
			// recover normal
			xmnormal = q.xyz;
		}

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


void main()
{
	#ifdef setxhornid
		setxhornid
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
		if (opos.x > 3.) discard;
	#endif
***********/

    vec3 texpos;        // position to use to compute texture
    vec3 xmnormal;  /* normals etc in object space */

	#if (defined(NOTDEFINED))

   // note OPMODE may be shadows even if SHADOWS not defined, eg for deferred render pass
    #elif (OPMODE == OPSHADOWS)
    	//float sf = gl_FragCoord.z*gl_FragCoord.w; //NO gl_FragCoord w very different from gl_Position.w
        // Just letting gl_Position->gl_FragCoord do it's thing and everything works ok
        // float udepth = 1. / gl_FragCoord.w;
        // gl_FragColor = gl_FragCoord;  // for debug
        // gl_FragColor.x = udepth; // gl_FragCoord;
        gl_FragColor = vec4(999);  // ignored, would like it if we didn't need it at all
        } // return;;

    #elif (OPMODE == OPMAKESKELBUFF)
        gl_FragColor = objpos;
        } // return;;

    #elif (OPMODE == OPOPOS)		// save horn source information
        #ifdef SCREENDOOR
            if (screenDoor > 0.) {
                // performance not.  screenDoor can add quite a lot to execution time
                // but this appears to be because of the extra pixel calculations needed
                // rather than the cost of the screenDoor/rand itself

                // better but too expensive screen door, ?prepare single lookup texture for screenDoor
                // if (fract(o.x*screenDoorX + o.y*screenDoorY + o.z*screenDoorZ) < screenDoor) discard;
                vec3 o = vec3(gl_FragCoord.xy, round(opos.w));  // so that each object fades out

                // simple geometric, looks bettter to me than then rand one
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
        gl_FragColor = opos;
#ifndef NOTR  // OPOPOS
// do not intergerize z for NOTR, opopos is 'real' value in that case
        gl_FragColor.z = floor(gl_FragColor.z + 0.1);  // in case interpolation has upset these integer values
#endif
        gl_FragColor.a = gl_FrontFacing ? round(gl_FragColor.a) : 99.;  // often ignored as later stages recompute from splitk

        } // return;;

    #elif (OPMODE == OPMAKEGBUFFX)
//>>> code below for stl generation
        // gbuffdot will select just one of x,y,z from objpos
        // and prepare it as four bytes values,
        // as we can't read pixel float values for webGL
        // +10000 makes sure number is positive.
        float q = dot(objpos.xyz, gbuffdot) + 10000.;
//float q = 12345.678;

        // breaking up value for output
        float K = 255.;
        float a = floor(q/K/K);
        q = q-a*K*K;
        float b = floor(q/K);
        q = q-b*K;
        float c = floor(q);
        q = q-c;
        float d = q;
        gl_FragColor = vec4(a/K, b/K, c/K, d);
        } // return;;

    #elif (OPMODE == OPPICK)   // unpack the pick data from pickVary and output
        int outslot = int(floor(gl_FragCoord.x));
        float v;
		gl_FragColor = (outslot == 0) ? pickVary0 : (outslot == 1) ? pickVary1 : (outslot == 2) ? pickVary2 :  pickVary3  ;
        } // return;;

    #elif (OPMODE == OPPOSITION)   // output scale information
    	//#ifdef GPUSCALE  // NO always use this and get data with readWebGLFloat
	        gl_FragColor = vec4( scaleVary, -scaleVary, scaleVary + 10000.,1.);  // experiment
		//#else
        //    {
		//	float d = (scaleVary + 1.) * 127.;  // %%%% typically range 0 to 254
		//	gl_FragColor = vec4( floor(d)/255., fract(d), 1., 1.); // ^^^^ split
        //   }
		//#endif
        } // return;;

    #elif (OPMODE == OPSHAPEPOS)  // save x,y,z
        // perform basic geometry
        vec4 lopos = textureget(rtopos, gl_FragCoord.xy * screen);  // get horn source position from OPOPOS buffer
		float lhornid = lopos.w;
		if (lhornid == 0.) discard;
		#ifndef SINGLEMULTI
			if (lhornid != hornid) discard;
        #endif
#ifdef NOTR  // OPSHAPEPOS, only process for correct horn/non-horn
if (lhornid != 2.) discard;
#else
if (lhornid == 2.) discard;
#endif
		// lopos.w = 1.;
        //if (lopos.w != hornid) discard;
		float ribnum;  // ribbing along one horn
		#ifdef SINGLEMULTI
			float vv = lopos.z + 0.5;
			//>>> !!chooseHornCode!!						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
			$$$chooseHornCode$$						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
			lhornid = lhornid == 99. ? 1. : xhornid;
		#endif
        vec4 shapepos = tr(lopos, xmnormal, texpos, ribnum);    /* compute horn shape. inc normals etc */
        vec4 trpos = shapepos * rot4wl;         // do our 4d rotation

        // multiplex position and orientation into multi.xyz
        // record orientation just as normal
        //     prevously we stored orientation as quaternion for full orientation
        //     but this lost tdo much normal precision, and extra mu,mv only needed for bump mapping and could be recomputed
        vec4 multi;
        multi.xyz = floor(shapepos.xyz * multifact) + (xmnormal+1.) * multiquatfact;

        if (latenormals != 0.) multi = shapepos;    // but with latenormals we just save position

        // now multiplex hornid~hornnum~ribparity into multi.w; for NO TR we don't have the extra
        multi.w = MAX_HORNS_FOR_TYPE*lhornid + lopos.z + mod(ribnum, 2.)*0.5;      // record horn detail, which horn multiplexed with which rib
if (lhornid == 2.) { //        #ifdef NOTR // OPSHAPEPOS
            multi.w = MAX_HORNS_FOR_TYPE * lhornid + ribnum;  // ribnum used as wallid for sharp wall edges with neighbour based normals
} //        #endif
        gl_FragColor = multi;
        } // return;;

    #elif (OPMODE == OPREGULAR)
		float vvv;
        vec4 shapepos = tr(opos, xmnormal, texpos, vvv);    /* compute horn shape. inc normals etc */
        #ifdef USESKELBUFFER
                float vv = opos.z;
                $$$chooseHornCode$$						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
        #endif
	    vec4 trpos = shapepos * rot4w;         // do our 4d rotation, note rot4wl uses lhornid, not available here
        gl_FragColor = lightingx(xmnormal, trpos, texpos);
        } // return;;

    #elif (OPMODE == OPOPOS2COL)
        vec4 lopos = textureget(rtopos, gl_FragCoord.xy * screen);    // get horn source from OPOPOS buffer:  ox,oy,owhere, hornid
		opos = lopos;  // needed for texture coordinate mixing
		float lhornid = lopos.w;
		colourid = lhornid;
		if (lhornid == 0.) discard;
		//	if (lhornid != hornid) discard;  // not valid for singlemulti
        lopos.w = 1.;                                                // reconstitute lopos.w
		float vv;
        vec4 shapepos = tr(lopos, xmnormal, texpos, vv);    // compute horn shape. inc normals etc
		$$$chooseHornCode$$						// make sure xhornid correct in SINGLEMULTI, noop if not SINGLEMULTI
        vec4 trpos = shapepos * rot4wl;         // do our 4d rotation
        texpos = shapepos.xyz;
//if (length(xmnormal) < 0.1 || length(xmnormal) > 10.)
//xmnormal = vec3(0.,0.,1.);
        gl_FragColor = lightingx(xmnormal, trpos, texpos);
        // mix in opos information, for debug
        vec4 xopox = vec4(lopos.x, lopos.z/9.0, lhornid/3., 1.);
        gl_FragColor = mix(gl_FragColor, xopox, xxoposprop);
        } // return;;

    #elif (OPMODE == OPTSHAPEPOS2COL)  // need to do the real lighting calculations
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos
        //xmnormal = normalize(vec3(1));
        texpos = shapepos.xyz;
        vec4 trpos = shapepos * rot4wc;
        gl_FragColor = lightingx(xmnormal, trpos, texpos);
        if (cutrad > 1.0) {
            float k = (cutfall - cutrad) /(cutfall - 0.99999);
            gl_FragColor.xyz *= k*k*(3. - 2.*k);
        }

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
        } // return;;

    #elif (OPMODE == OPBUMPNORMAL)  // need to do some of the real lighting calculations
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos

        texpos = shapepos.xyz;
        vec4 trpos = shapepos * rot4wl;
		vec3 unusedviewdir;
		float unusedviewdist;
        gl_FragColor = vec4(getBumpedNormal(xmnormal, trpos, texpos, unusedviewdir, unusedviewdist), /**xxopos.w + MAX_HORNS_FOR_TYPE*xhornid */ fullkey);
        } // return;;

    #elif (OPMODE == OPTEXTURE)  // comupte and save the texture, as viewed from the screen
		// opos only needed here because of mixing texture spaces
        vec4 lopos = textureget(rtopos, gl_FragCoord.xy * screen);    // get horn source from OPOPOS buffer:  ox,oy,owhere, hornid
        vec4 shapepos;
        float fullkey;
        getPosNormalColid(OUT xmnormal, OUT shapepos, OUT xhornid, OUT fullkey);  // nb sets colourid = xhornid from rtshapepos
        texpos = shapepos.xyz / max(texscale, 0.0001);

        gl_FragColor.w = /**lopos.w +**/ MAX_HORNS_FOR_TYPE*xhornid;
        gl_FragColor.x = gl_FragColor.y = gl_FragColor.z = textvalmix(texpos.xyz, lopos.xyz, texrepeat); // + texoffset;  to range approx 0 .. 1
        } // return;;

    #elif (OPMODE == -1)
		}
    #else
        hi hi hi unexpected OPMODE op mode
    #endif
// end of main(), but } added in each case above


#else  // OPTEST
	uniform float hornid;
	uniform float cutx, cuty;
	uniform vec2 screen;
	varying vec4 opos;         //
void main() {
	//vec2 p = (gl_FragCoord.xy * screen - 0.5) * vec2(cutx, cuty);
	//if (p.x*p.x + p.y*p.y > 1.) {
	//	discard;
	//	}
	// gl_FragColor = vec4(0,1,1,1); // opos;
	gl_FragColor = opos;
	// gl_FragColor.z = floor(gl_FragColor.z + 0.1);  // in case interpolation has upset these integer values
	gl_FragColor.a = hornid;
}

#endif

// end overrides here, needed for overrides that access methods and uniforms, etc
$$$endoverrides$$
